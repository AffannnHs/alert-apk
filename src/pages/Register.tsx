import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Eye, EyeOff, MapPin } from 'lucide-react';
import { z } from 'zod';

const formatPhone = (value: string) => {
  let num = value.replace(/\D/g, '');
  if (num.startsWith('62')) num = '0' + num.slice(2);
  return num.slice(0, 13);
};

const validatePhone = (value: string) => {
  if (!value.startsWith('08')) return 'Nomor HP harus diawali 08';
  if (value.length < 10) return 'Nomor HP minimal 10 digit';
  if (value.length > 13) return 'Nomor HP maksimal 13 digit';
  return null;
};

const checkStrength = (pass: string) => {
  const checks = {
    length: pass.length >= 8 && pass.length <= 15,
    lower: /[a-z]/.test(pass),
    upper: /[A-Z]/.test(pass),
    number: /[0-9]/.test(pass),
    symbol: /[!@#$%^&*_-]/.test(pass),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
};

const strengthLabel: Record<
  number,
  { text: string; color: string; bar: string }
> = {
  1: { text: 'LEMAH', color: 'text-red-500', bar: 'bg-red-500 w-1/4' },
  2: { text: 'LEMAH', color: 'text-red-500', bar: 'bg-red-500 w-2/4' },
  3: { text: 'CUKUP', color: 'text-yellow-500', bar: 'bg-yellow-500 w-2/4' },
  4: { text: 'KUAT', color: 'text-blue-500', bar: 'bg-blue-500 w-3/4' },
  5: { text: 'SANGAT KUAT', color: 'text-green-500', bar: 'bg-green-500 w-full' },
};

const strengthItems = [
  { key: 'lower', label: 'Huruf kecil (a-z)' },
  { key: 'upper', label: 'Huruf besar (A-Z)' },
  { key: 'number', label: 'Angka (0-9)' },
  { key: 'symbol', label: 'Simbol (!@#$%^&*_-)'},
  { key: 'length', label: '8-15 karakter' },
] as const;

const blockedDomains = [
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  'yopmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'maildrop.cc',
  'dispostable.com',
];

const validateEmail = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const domain = normalized.split('@')[1]?.toLowerCase();
  if (domain && blockedDomains.includes(domain)) {
    return 'Email disposable/temporary tidak diizinkan';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return 'Format email tidak valid';
  }
  return null;
};

const checkRateLimit = (setError: (msg: string) => void) => {
  const lastAttempt = localStorage.getItem('last_register_attempt');
  if (!lastAttempt) return true;
  const diff = Date.now() - Number(lastAttempt);
  if (Number.isNaN(diff)) return true;
  if (diff < 60000) {
    const waitSeconds = Math.ceil((60000 - diff) / 1000);
    setError(`Tunggu ${waitSeconds} detik sebelum mencoba lagi`);
    return false;
  }
  return true;
};

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama terlalu panjang'),
  email: z.string().trim().email('Format email tidak valid').max(255, 'Email terlalu panjang'),
  phone: z.string().regex(/^08\d{8,11}$/, 'Format nomor HP tidak valid (08xxxxxxxxxx)'),
  password: z.string().min(8, 'Password minimal 8 karakter').max(15, 'Password maksimal 15 karakter'),
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
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formStartTime] = useState(() => Date.now());

  const strength = checkStrength(password);
  const strengthMeta = strengthLabel[strength.score];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 2000));
      navigate('/pending', { replace: true });
      return;
    }

    const timeSpent = Date.now() - formStartTime;
    if (timeSpent < 3000) {
      setError('Isi form terlalu cepat. Silakan isi ulang.');
      return;
    }

    if (!checkRateLimit(setError)) return;
    localStorage.setItem('last_register_attempt', Date.now().toString());

    if (!name.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      setError('Semua field wajib diisi');
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    if (password.length > 15) {
      setError('Password maksimal 15 karakter');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    if (checkStrength(password).score < 5) {
      setError('Password belum memenuhi semua kriteria keamanan');
      return;
    }

    const validation = registerSchema.safeParse({ name, email: email.trim(), phone, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (!locationConsent) {
      setError('Centang persetujuan lokasi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let lat: number | null = null;
      let lng: number | null = null;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        lat = null;
        lng = null;
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name: name.trim() } },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          setError('Email sudah terdaftar. Gunakan email lain.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Gagal membuat akun. Coba lagi.');
        setLoading(false);
        return;
      }

      const expectedUserId = authData.user.id;

      const waitForSession = async () => {
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user?.id === expectedUserId) return true;
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        return false;
      };

      await waitForSession();

      const userPayload = {
        id: expectedUserId,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        role: 'MEMBER',
        status: 'PENDING',
        last_lat: lat,
        last_lng: lng,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      } as const;

      const { error: insertError } = await supabase.from('users').insert(userPayload);

      if (insertError) {
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(userPayload, { onConflict: 'id' });

        if (upsertError) {
          setError('Gagal menyimpan data. Coba lagi.');
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      navigate('/pending', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan. Periksa koneksi dan coba lagi.');
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
          <input
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{
              opacity: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              height: 0,
              width: 0,
              zIndex: -1,
              pointerEvents: 'none',
            }}
            tabIndex={-1}
            autoComplete="off"
            name="website"
          />
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
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              required
              className="h-12 bg-secondary border-border"
              placeholder="08123456789"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label>Password * (min. 8, max. 15)</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-secondary border-border pr-12"
                placeholder="••••••••"
                maxLength={15}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#2e3248] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthMeta?.bar ?? ''}`}
                    />
                  </div>
                  <span className={`text-xs font-bold ${strengthMeta?.color ?? ''}`}>
                    {strengthMeta?.text ?? ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {strengthItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 text-xs">
                      <span>{strength.checks[item.key] ? '✅' : '❌'}</span>
                      <span className={strength.checks[item.key] ? 'text-green-400' : 'text-[#94a3b8]'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Konfirmasi Password *</Label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 bg-secondary border-border pr-12"
                placeholder="••••••••"
                maxLength={15}
              />
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

          <Button
            type="submit"
            disabled={
              loading ||
              strength.score < 5 ||
              !name.trim() ||
              !email.trim() ||
              !phone.trim() ||
              !locationConsent
            }
            className="h-14 w-full rounded-xl text-base font-bold"
          >
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
