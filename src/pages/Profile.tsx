import BottomNavigation from '@/components/BottomNavigation';
import { useAuthStore } from '@/store/authStore';

const Profile = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <div className="px-5 pt-6">
        <h1 className="text-lg font-bold text-foreground">👤 Profil Saya</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {(user?.name || 'U').slice(0, 2).toUpperCase()}
        </div>
        <p className="font-semibold text-foreground">{user?.name}</p>
        <p className="text-xs text-muted-foreground">{user?.role} • {user?.group_name || 'Tanpa Grup'}</p>
        <p className="mt-4 text-sm text-muted-foreground">Profil lengkap — Phase 5</p>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Profile;
