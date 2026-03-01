import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { MessageCircle, Users } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';

const severityColor: Record<string, string> = {
  CRITICAL: 'border-l-[hsl(var(--emergency))]',
  HIGH: 'border-l-[hsl(var(--warning-orange))]',
  MEDIUM: 'border-l-[hsl(var(--warning-yellow))]',
  LOW: 'border-l-[hsl(var(--info-blue))]',
};

const typeEmoji: Record<string, string> = {
  FIRE: '🔥', MEDICAL: '🏥', CRIME: '🦹', DISASTER: '🌊', HELP: '🆘',
};

const steps = [
  { status: 'ACKNOWLEDGED', label: '✅ Tahu', bg: 'bg-[hsl(var(--warning-yellow))]' },
  { status: 'EN_ROUTE', label: '🔵 Menuju', bg: 'bg-[hsl(var(--info-blue))]' },
  { status: 'ARRIVED', label: '🟢 Tiba', bg: 'bg-[hsl(var(--success))]' },
];

const Alerts = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<any[]>([]);
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
      // Fetch my responses for these alerts
      const alertIds = data.map((a: any) => a.id);
      if (alertIds.length > 0) {
        const { data: responses } = await supabase
          .from('alert_responders' as any)
          .select('alert_id, status')
          .eq('user_id', user.id)
          .in('alert_id', alertIds);
        if (responses) {
          const map: Record<string, string> = {};
          (responses as any[]).forEach((r: any) => { map[r.alert_id] = r.status; });
          setMyResponses(map);
        }
        // Fetch responder counts
        const { data: counts } = await supabase
          .from('alert_responders' as any)
          .select('alert_id')
          .in('alert_id', alertIds);
        if (counts) {
          const cmap: Record<string, number> = {};
          (counts as any[]).forEach((r: any) => {
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
    const payload: any = {
      alert_id: alertId,
      user_id: user.id,
      status: newStatus,
    };
    if (newStatus === 'ACKNOWLEDGED') payload.acknowledged_at = new Date().toISOString();
    if (newStatus === 'EN_ROUTE') payload.en_route_at = new Date().toISOString();
    if (newStatus === 'ARRIVED') payload.arrived_at = new Date().toISOString();

    await supabase.from('alert_responders' as any).upsert(payload, { onConflict: 'alert_id,user_id' });
    setMyResponses(prev => ({ ...prev, [alertId]: newStatus }));
    fetchActive();
  };

  const timeAgo = (d: string) => {
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true, locale: id });
    } catch { return ''; }
  };

  const alerts = tab === 'active' ? activeAlerts : historyAlerts;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <div className="px-5 pt-6">
        <h1 className="text-lg font-bold text-foreground">🚨 Alert Saya</h1>
      </div>

      {/* Tabs */}
      <div className="mx-5 mt-4 flex gap-2">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'active'
              ? 'bg-[hsl(var(--emergency))] text-[hsl(var(--emergency-foreground))]'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          Aktif ({activeAlerts.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            tab === 'history'
              ? 'bg-[hsl(var(--emergency))] text-[hsl(var(--emergency-foreground))]'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          Riwayat ({historyAlerts.length})
        </button>
      </div>

      {/* Alert Cards */}
      <div className="mx-5 mt-4 space-y-3">
        {alerts.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {tab === 'active' ? 'Tidak ada alert aktif' : 'Belum ada riwayat'}
          </p>
        )}
        {alerts.map((alert: any) => (
          <div
            key={alert.id}
            className={`rounded-xl border border-border bg-card p-4 border-l-4 ${
              severityColor[alert.severity] || 'border-l-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-[hsl(var(--emergency))]">
                ● {alert.severity}
              </span>
              <span className="text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {typeEmoji[alert.type] || '⚠️'} {alert.type}
            </p>
            {alert.address && (
              <p className="mt-1 text-xs text-muted-foreground">📍 {alert.address}</p>
            )}
            <p className="text-xs text-muted-foreground">
              👤 {alert.reporter_name || 'Unknown'}
            </p>

            {/* Response buttons (only for active) */}
            {tab === 'active' && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-muted-foreground">Respons saya:</p>
                <div className="flex gap-2">
                  {steps.map((step) => {
                    const isActive = myResponses[alert.id] === step.status;
                    return (
                      <button
                        key={step.status}
                        onClick={() => updateStatus(alert.id, step.status)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                          isActive
                            ? `${step.bg} text-foreground`
                            : 'border border-border bg-secondary text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {responderCounts[alert.id] || 0} responder
              </span>
              <button
                onClick={() => navigate(`/alerts/${alert.id}`)}
                className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--info-blue))]"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Lihat Chat →
              </button>
            </div>
          </div>
        ))}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Alerts;
