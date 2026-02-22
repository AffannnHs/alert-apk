import BottomNavigation from '@/components/BottomNavigation';

const Alerts = () => (
  <div className="flex min-h-screen flex-col bg-background pb-20">
    <div className="px-5 pt-6">
      <h1 className="text-lg font-bold text-foreground">🚨 Alert Saya</h1>
    </div>
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted-foreground">Alerts — Phase 3</p>
    </div>
    <BottomNavigation />
  </div>
);

export default Alerts;
