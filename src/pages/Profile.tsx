import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Key, Bell, BellOff, ChevronRight, Info } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const roleBadge: Record<string, string> = {
  SUPER_ADMIN: 'bg-[hsl(var(--emergency))]',
  ADMIN: 'bg-[hsl(var(--warning-orange))]',
  COORDINATOR: 'bg-[hsl(var(--info-blue))]',
  MEMBER: 'bg-[hsl(var(--success))]',
};

const Profile = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ alertSent: 0, alertResponded: 0 });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(
    localStorage.getItem('notif_enabled') !== 'false'
  );

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [sent, responded] = await Promise.all([
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('triggered_by', user.id),
        supabase.from('alert_responders' as any).select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      setStats({
        alertSent: sent.count || 0,
        alertResponded: responded.count || 0,
      });
    };
    fetchStats();
  }, [user]);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const toggleNotif = async () => {
    const newVal = !notifEnabled;
    setNotifEnabled(newVal);
    localStorage.setItem('notif_enabled', String(newVal));
    if (newVal && 'Notification' in window) {
      await Notification.requestPermission();
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }
    setChanging(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '', password: oldPassword,
    });
    if (signInError) {
      toast.error('Password lama salah');
      setChanging(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error('Gagal ganti password');
    } else {
      toast.success('✅ Password berhasil diubah');
      setShowPasswordModal(false);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    }
    setChanging(false);
  };

  const handleLogout = () => {
    if (window.confirm('Yakin ingin keluar?')) {
      supabase.auth.signOut().then(() => {
        useAuthStore.getState().logout();
        navigate('/login');
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <div className="px-5 pt-6">
        <h1 className="text-lg font-bold text-foreground">👤 Profil Saya</h1>
      </div>

      {/* Avatar + Name */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[hsl(var(--emergency))] text-2xl font-bold text-[hsl(var(--emergency-foreground))]">
          {getInitials(user?.name)}
        </div>
        <p className="text-xl font-bold text-foreground">{user?.name || 'User'}</p>
        {user?.role && (
          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold text-foreground ${roleBadge[user.role] || 'bg-secondary'}`}>
            {user.role}
          </span>
        )}
        <p className="text-xs text-[hsl(var(--success))]">🟢 Aktif</p>
      </div>

      {/* Contact Info */}
      <div className="mx-5 mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Info Kontak</p>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm text-foreground">📧 {user?.email || '-'}</p>
          <p className="text-sm text-foreground">📱 {user?.phone || '-'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statistik</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.alertSent}</p>
            <p className="text-xs text-muted-foreground">Alert Dikirim</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.alertResponded}</p>
            <p className="text-xs text-muted-foreground">Alert Direspons</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="mx-5 mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pengaturan</p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <button
            onClick={toggleNotif}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              {notifEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              Notifikasi
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              notifEnabled ? 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]' : 'bg-secondary text-muted-foreground'
            }`}>
              {notifEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="mx-5 mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Akun</p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              <Key className="h-4 w-4" /> Ganti Password
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-foreground">
              <Info className="h-4 w-4" /> Versi Aplikasi
            </span>
            <span className="text-xs text-muted-foreground">1.0.0</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="flex items-center gap-2 text-sm text-[hsl(var(--emergency))]">
              <LogOut className="h-4 w-4" /> Keluar
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowPasswordModal(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl border-t border-border bg-card p-6 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold text-foreground">🔑 Ganti Password</h3>
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="Password Lama"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password Baru (min 8 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Konfirmasi Password Baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPasswordModal(false)}>
                Batal
              </Button>
              <Button className="flex-1" onClick={handleChangePassword} disabled={changing}>
                {changing ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default Profile;
