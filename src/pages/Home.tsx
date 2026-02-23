import { useState, useEffect } from 'react';
import BottomNavigation from '@/components/BottomNavigation';
import PanicButton from '@/components/PanicButton';
import EmergencyTypeModal from '@/components/EmergencyTypeModal';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';

interface ActiveAlert {
  id: string;
  type: string;
  severity: string;
  reporter_name: string | null;
  created_at: string;
  status: string;
}

interface OnlineMember {
  id: string;
  name: string | null;
  display_name: string | null;
  role: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  FIRE: '🔥', MEDICAL: '🏥', CRIME: '🚔', DISASTER: '🌊', HELP: '🆘',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'border-l-primary',
  HIGH: 'border-l-[hsl(var(--warning-orange))]',
  MEDIUM: 'border-l-[hsl(var(--warning-yellow))]',
};

const Home = () => {
  const user = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Fetch active alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('alerts')
        .select('id, type, severity, reporter_name, created_at, status')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setActiveAlerts(data);
    };
    fetchAlerts();

    // Realtime subscription
    const channel = supabase
      .channel('active-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch online members (seen in last 10 min)
  useEffect(() => {
    const fetchMembers = async () => {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('users')
        .select('id, name, display_name, role')
        .eq('status', 'ACTIVE')
        .gte('last_seen_at', tenMinAgo)
        .limit(20);
      if (data) setOnlineMembers(data);
    };
    fetchMembers();
    const interval = setInterval(fetchMembers, 60000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} jam lalu`;
  };

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
      <div className="mx-5 mt-4 rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 p-3">
        <p className="text-sm font-medium text-[hsl(var(--success))]">🟢 Mode Normal</p>
        <p className="text-xs text-muted-foreground">GPS update: 5 menit sekali</p>
      </div>

      {/* Panic Button */}
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <PanicButton onTrigger={() => setModalOpen(true)} />
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mx-5 mb-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">🚨 Alert Aktif</h2>
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border border-border bg-card p-3 border-l-4 ${
                  SEVERITY_COLORS[alert.severity] || 'border-l-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {TYPE_ICONS[alert.type] || '⚠️'} {alert.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Oleh: {alert.reporter_name || 'Unknown'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Members */}
      {onlineMembers.length > 0 && (
        <div className="mx-5 mb-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            🟢 Online ({onlineMembers.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {onlineMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {getInitials(m.display_name || m.name)}
                </div>
                <span className="text-xs font-medium text-foreground">
                  {m.display_name || m.name || 'User'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmergencyTypeModal open={modalOpen} onOpenChange={setModalOpen} />
      <BottomNavigation />
    </div>
  );
};

export default Home;
