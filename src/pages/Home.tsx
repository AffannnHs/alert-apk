import BottomNavigation from '@/components/BottomNavigation';
import { useAuthStore } from '@/store/authStore';

const Home = () => {
  const user = useAuthStore((s) => s.user);
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6">
        <div>
          <h1 className="text-lg font-bold text-foreground">Halo, {user?.name || 'User'} 👋</h1>
          <p className="text-xs text-muted-foreground">{today}</p>
        </div>
      </div>

      {/* GPS Status */}
      <div className="mx-5 mt-4 rounded-xl border border-success/30 bg-success/10 p-3">
        <p className="text-sm font-medium text-success">🟢 Mode Normal</p>
        <p className="text-xs text-muted-foreground">GPS update: 5 menit sekali</p>
      </div>

      {/* Panic Button Placeholder */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-xs text-muted-foreground">Panic Button — Phase 2</p>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Home;
