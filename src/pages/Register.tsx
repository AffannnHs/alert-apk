import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Eye, EyeOff, MapPin } from 'lucide-react';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama terlalu panjang'),
  email: z.string().trim().email('Format email tidak valid').max(255, 'Email terlalu panjang'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Format nomor HP tidak valid (10-15 digit)'),
  password: z.string().min(8, 'Password minimal 8 karakter').max(128, 'Password terlalu panjang'),
});

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    const validation = registerSchema.safeParse({ name, email: email.trim(), phone, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (!locationConsent) {
      setError('Anda harus menyetujui penggunaan lokasi');
      return;
    }

    setLoading(true);

    try {
      // Get GPS location
      const getPosition = (): Promise<GeolocationPosition | null> =>
        new Promise((resolve) => {
          if (!navigator.geolocation) { resolve(null); return; }
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 10000 });
        });

      const pos = await getPosition();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name } },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { error: insertError } = await supabase.from('users').insert({
          id: authData.user.id,
          name,
          email: email.trim(),
          phone,
          role: 'MEMBER',
          status: 'PENDING',
          last_lat: pos?.coords.latitude ?? null,
          last_lng: pos?.coords.longitude ?? null,
        });

        if (insertError) {
          setError('Gagal menyimpan data. Coba lagi.');
          setLoading(false);
          return;
        }
      }

      navigate('/pending');
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      <Link to="/login" className="mb-6 flex items-center gap-2 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Login
      </Link>

      <div className="w-full max-w-sm mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Daftar Akun Baru</h1>
          <p className="text-sm text-muted-foreground">Isi data diri dengan lengkap</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Lengkap *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-12 bg-secondary border-border" placeholder="Nama lengkap" />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 bg-secondary border-border" placeholder="email@contoh.com" />
          </div>

          <div className="space-y-2">
            <Label>Nomor HP *</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="h-12 bg-secondary border-border" placeholder="+62 812-xxxx-xxxx" />
          </div>

          <div className="space-y-2">
            <Label>Password * (min. 8 karakter)</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 bg-secondary border-border pr-12" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Konfirmasi Password *</Label>
            <div className="relative">
              <Input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-12 bg-secondary border-border pr-12" placeholder="••••••••" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-info-blue" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Persetujuan Lokasi</p>
                <p>Sistem ini menggunakan lokasi Anda untuk:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Verifikasi pendaftaran</li>
                  <li>Koordinasi respons darurat</li>
                </ul>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={locationConsent}
                onCheckedChange={(checked) => setLocationConsent(checked === true)}
              />
              <span className="text-xs text-muted-foreground">Saya setuju untuk berbagi lokasi saya</span>
            </label>
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="h-14 w-full rounded-xl text-base font-bold">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              'DAFTAR SEKARANG'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Register;
