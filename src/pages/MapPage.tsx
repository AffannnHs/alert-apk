import BottomNavigation from '@/components/BottomNavigation';

const MapPage = () => (
  <div className="flex min-h-screen flex-col bg-background pb-20">
    <div className="px-5 pt-6">
      <h1 className="text-lg font-bold text-foreground">🗺️ Peta Tim</h1>
    </div>
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted-foreground">Peta Tim — Phase 4</p>
    </div>
    <BottomNavigation />
  </div>
);

export default MapPage;
