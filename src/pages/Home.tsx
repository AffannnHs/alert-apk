import { useState, useEffect } from 'react';
import PanicButton from '@/components/PanicButton';
import EmergencyTypeModal from '@/components/EmergencyTypeModal';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <div className="flex flex-col gap-6 pb-20 lg:pb-0 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {user?.name || 'User'}. {today}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Main Action Area - Panic Button */}
        <Card className="col-span-full lg:col-span-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-lg overflow-hidden relative">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Status Darurat
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[300px] gap-8 py-8">
                 <div className="scale-110 lg:scale-125 transition-transform">
                    <PanicButton onTrigger={() => setModalOpen(true)} />
                 </div>
                 <p className="text-foreground/80 font-medium text-center max-w-sm text-sm">
                    Tekan dan tahan tombol di atas selama 3 detik untuk mengirim sinyal darurat ke seluruh anggota aktif.
                 </p>
            </CardContent>
        </Card>

        {/* Status & Alerts Column */}
        <div className="space-y-6 flex flex-col">
            <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex justify-between items-center">
                        Status Sistem
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="space-y-3">
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-muted-foreground">GPS Status</span>
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-muted-foreground">Koneksi</span>
                            <span className="text-foreground font-medium">Stabil</span>
                        </div>
                     </div>
                </CardContent>
            </Card>

             {/* Active Alerts List */}
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <span>🚨</span> Alert Aktif
                        {activeAlerts.length > 0 && <Badge variant="destructive" className="ml-auto">{activeAlerts.length}</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-[200px]">
                    <ScrollArea className="h-[200px] pr-4">
                        {activeAlerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8 gap-2">
                                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <span className="text-2xl">🛡️</span>
                                </div>
                                <span className="text-sm font-medium">Aman terkendali</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeAlerts.map((alert) => (
                                    <div key={alert.id} className={`p-3 rounded-lg border bg-card/50 transition-colors hover:bg-accent ${SEVERITY_COLORS[alert.severity]} border-l-4`}>
                                        <div className="flex justify-between items-start">
                                            <div className="font-medium flex items-center gap-2 text-sm">
                                                {TYPE_ICONS[alert.type]} {alert.type}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(alert.created_at)}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <span>👤</span> {alert.reporter_name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Online Members */}
      <Card>
        <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                Anggota Online ({onlineMembers.length > 0 ? onlineMembers.length : 1})
            </CardTitle>
        </CardHeader>
        <CardContent>
             {onlineMembers.length === 0 ? (
                <div className="flex items-center gap-2 bg-secondary/30 px-3 py-2 rounded-full border border-transparent w-fit">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-xs border border-green-500/20">
                    {getInitials(user?.name)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">{user?.name} (Anda)</span>
                        <span className="text-[10px] text-muted-foreground">Online</span>
                    </div>
                </div>
             ) : (
                 <div className="flex flex-wrap gap-3">
                    {onlineMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 bg-secondary/30 hover:bg-secondary/50 transition-colors px-3 py-2 rounded-full border border-transparent hover:border-border cursor-default">
                             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                                {getInitials(m.display_name || m.name)}
                             </div>
                             <div className="flex flex-col">
                                <span className="text-sm font-medium leading-none">{m.display_name || m.name}</span>
                                <span className="text-[10px] text-muted-foreground">{m.role || 'Member'}</span>
                             </div>
                        </div>
                    ))}
                 </div>
             )}
        </CardContent>
      </Card>

      <EmergencyTypeModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
};

export default Home;
