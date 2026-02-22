import { Home, AlertTriangle, Map, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex min-w-[64px] flex-col items-center gap-1 p-2 transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <tab.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
