import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { MessageCircle, Users, MapPin, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const severityColor: Record<string, string> = {
  CRITICAL: 'border-l-[hsl(var(--emergency))]',
  HIGH: 'border-l-[hsl(var(--warning-orange))]',
  MEDIUM: 'border-l-[hsl(var(--warning-yellow))]',
  LOW: 'border-l-[hsl(var(--info-blue))]',
};

const typeEmoji: Record<string, string> = {
  FIRE: '🔥', MEDICAL: '🏥', CRIME: '🦹', DISASTER: '🌊', HELP: '🆘',
};

type AlertRow = Tables<"alerts">;
type AlertResponderRow = Tables<"alert_responders">;
type AlertResponderInsert = TablesInsert<"alert_responders">;

const steps = [
  { status: 'ACKNOWLEDGED', label: 'Tahu', emoji: '✅' },
  { status: 'EN_ROUTE', label: 'Menuju', emoji: '🔵' },
  { status: 'ARRIVED', label: 'Tiba', emoji: '🟢' },
];

const Alerts = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [activeAlerts, setActiveAlerts] = useState<AlertRow[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<AlertRow[]>([]);
  const [myResponses, setMyResponses] = useState<Record<string, string>>({});
  const [responderCounts, setResponderCounts] = useState<Record<string, number>>({});

  const fetchActive = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .in('status', ['ACTIVE', 'ESCALATED'])
      .order('created_at', { ascending: false });

    if (data) {
      setActiveAlerts(data);
      const alertIds = data.map((a) => a.id);
      if (alertIds.length > 0) {
        const { data: responses } = await supabase
          .from('alert_responders')
          .select('alert_id, status')
          .eq('user_id', user.id)
          .in('alert_id', alertIds);
        if (responses) {
          const map: Record<string, string> = {};
          responses.forEach((r) => { map[r.alert_id] = r.status; });
          setMyResponses(map);
        }
        const { data: counts } = await supabase
          .from('alert_responders')
          .select('alert_id')
          .in('alert_id', alertIds);
        if (counts) {
          const cmap: Record<string, number> = {};
          counts.forEach((r) => {
            cmap[r.alert_id] = (cmap[r.alert_id] || 0) + 1;
          });
          setResponderCounts(cmap);
        }
      }
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'RESOLVED')
      .order('resolved_at', { ascending: false })
      .limit(20);
    if (data) setHistoryAlerts(data);
  }, []);

  useEffect(() => {
    fetchActive();
    fetchHistory();
    const channel = supabase
      .channel('alerts-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchActive();
        fetchHistory();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchActive, fetchHistory]);

  const updateStatus = async (alertId: string, newStatus: string) => {
    if (!user) return;
    const payload: AlertResponderInsert = {
      alert_id: alertId,
      user_id: user.id,
      status: newStatus,
    };
    if (newStatus === 'ACKNOWLEDGED') payload.acknowledged_at = new Date().toISOString();
    if (newStatus === 'EN_ROUTE') payload.en_route_at = new Date().toISOString();
    if (newStatus === 'ARRIVED') payload.arrived_at = new Date().toISOString();
    
    await supabase.from('alert_responders').upsert(payload, { onConflict: 'alert_id,user_id' });
    setMyResponses(prev => ({ ...prev, [alertId]: newStatus }));
    fetchActive();
  };

  const timeAgo = (d: string) => {
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true, locale: idLocale });
    } catch { return ''; }
  };

  const AlertCard = ({ alert, active }: { alert: AlertRow; active: boolean }) => (
    <Card key={alert.id} className={`overflow-hidden border-l-4 ${severityColor[alert.severity] || 'border-l-border'} transition-all hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <span className="text-2xl">{typeEmoji[alert.type] || '⚠️'}</span>
                <div>
                    <CardTitle className="text-base">{alert.type}</CardTitle>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        {timeAgo(alert.created_at)}
                    </div>
                </div>
            </div>
            <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                {alert.severity}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-2">
        <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>{alert.address || 'Lokasi tidak tersedia'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Oleh: {alert.reporter_name || 'Unknown'}</span>
        </div>

        {active && (
            <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Update Status Saya:</p>
                <div className="flex gap-2 flex-wrap">
                    {steps.map((step) => {
                        const isActive = myResponses[alert.id] === step.status;
                        return (
                            <Button
                                key={step.status}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateStatus(alert.id, step.status)}
                                className={`flex-1 ${isActive ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            >
                                <span className="mr-1">{step.emoji}</span> {step.label}
                            </Button>
                        )
                    })}
                </div>
            </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/50 py-2 px-4 flex justify-between items-center">
         <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {responderCounts[alert.id] || 0} responder
         </div>
         <Button variant="ghost" size="sm" onClick={() => navigate(`/alerts/${alert.id}`)} className="h-8 text-xs gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            Chat Room
         </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4 pb-20 lg:pb-0 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Daftar Alert</h1>
        <p className="text-muted-foreground">Pantau dan respon situasi darurat di sekitar Anda.</p>
      </div>

      <Tabs defaultValue="active" className="w-full flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
          <TabsTrigger value="active">Aktif ({activeAlerts.length})</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="flex-1 mt-0">
             <ScrollArea className="h-[calc(100vh-250px)] pr-4">
                {activeAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <span className="text-4xl mb-2">🛡️</span>
                        <p>Tidak ada alert aktif saat ini.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeAlerts.map(alert => <AlertCard key={alert.id} alert={alert} active={true} />)}
                    </div>
                )}
             </ScrollArea>
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 mt-0">
             <ScrollArea className="h-[calc(100vh-250px)] pr-4">
                {historyAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <p>Belum ada riwayat alert.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {historyAlerts.map(alert => <AlertCard key={alert.id} alert={alert} active={false} />)}
                    </div>
                )}
             </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Alerts;
