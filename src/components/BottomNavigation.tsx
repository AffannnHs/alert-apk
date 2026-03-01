import { Home, AlertTriangle, Map, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/map', label: 'Peta', icon: Map },
  { path: '/profile', label: 'Profil', icon: User },
];

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 pb-safe">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-all duration-300 active:scale-95",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn("relative p-1 rounded-full transition-all", isActive && "bg-primary/10")}>
                 <tab.icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5px]")} />
            </div>
            <span className={cn("text-[10px] font-medium transition-all", isActive ? "text-primary" : "text-muted-foreground")}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
