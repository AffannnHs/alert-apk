import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Key, Bell, BellOff, ChevronRight, Info, User, Mail, Phone, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';

const roleBadge: Record<string, string> = {
  SUPER_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  ADMIN: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  COORDINATOR: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  MEMBER: 'bg-green-500/10 text-green-500 border-green-500/20',
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
        supabase.from('alert_responders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
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

  const toggleNotif = async (checked: boolean) => {
    setNotifEnabled(checked);
    localStorage.setItem('notif_enabled', String(checked));
    if (checked && 'Notification' in window) {
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
      supabase.auth.signOut().then(() => {
        useAuthStore.getState().logout();
        navigate('/login');
      });
  };

  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Profil Pengguna</h1>
        <p className="text-muted-foreground">Kelola informasi akun dan preferensi Anda.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
         {/* Left Column: Identity Card */}
         <Card className="lg:col-span-1 h-fit">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 relative">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                            {getInitials(user?.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-green-500 border-4 border-background" title="Online"></div>
                </div>
                <CardTitle className="text-xl">{user?.name || 'User'}</CardTitle>
                <CardDescription className="flex justify-center gap-2 mt-1">
                     {user?.role && (
                        <Badge variant="outline" className={`${roleBadge[user.role]} px-2 py-0.5`}>
                            {user.role}
                        </Badge>
                     )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" /> Email
                    </div>
                    <p className="font-medium text-sm">{user?.email || '-'}</p>
                </div>
                <Separator />
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" /> Telepon
                    </div>
                    <p className="font-medium text-sm">{user?.phone || '-'}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-2xl font-bold">{stats.alertSent}</p>
                        <p className="text-xs text-muted-foreground">Alert Dikirim</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-2xl font-bold">{stats.alertResponded}</p>
                        <p className="text-xs text-muted-foreground">Alert Direspons</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button variant="destructive" className="w-full" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Keluar
                 </Button>
            </CardFooter>
         </Card>

         {/* Right Column: Settings */}
         <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" /> Keamanan & Akun
                    </CardTitle>
                    <CardDescription>Pengaturan keamanan dan password akun Anda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-2 rounded-lg border bg-card">
                         <div className="space-y-0.5">
                            <Label className="text-base">Password</Label>
                            <p className="text-sm text-muted-foreground">Ganti password akun Anda secara berkala.</p>
                         </div>
                         <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Key className="mr-2 h-4 w-4" /> Ganti Password
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Ganti Password</DialogTitle>
                                    <DialogDescription>
                                        Masukkan password lama dan password baru Anda.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Password Lama</Label>
                                        <Input
                                            type="password"
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password Baru</Label>
                                        <Input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Konfirmasi Password Baru</Label>
                                        <Input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Batal</Button>
                                    <Button onClick={handleChangePassword} disabled={changing}>
                                        {changing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                         </Dialog>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Bell className="h-5 w-5" /> Notifikasi
                    </CardTitle>
                    <CardDescription>Atur preferensi notifikasi aplikasi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-2">
                        <div className="space-y-0.5">
                            <Label className="text-base">Push Notifications</Label>
                            <p className="text-sm text-muted-foreground">Terima notifikasi untuk alert darurat.</p>
                        </div>
                        <Switch checked={notifEnabled} onCheckedChange={toggleNotif} />
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="h-5 w-5" /> Tentang Aplikasi
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm py-2 border-b">
                        <span className="text-muted-foreground">Versi Aplikasi</span>
                        <span className="font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b">
                        <span className="text-muted-foreground">Build</span>
                        <span className="font-medium">Production</span>
                    </div>
                    <div className="pt-4 text-xs text-muted-foreground text-center">
                        &copy; 2024 Alert App Team. All rights reserved.
                    </div>
                </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
};

export default Profile;
