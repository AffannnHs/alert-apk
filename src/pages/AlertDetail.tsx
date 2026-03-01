import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';

const typeEmoji: Record<string, string> = {
  FIRE: '🔥', MEDICAL: '🏥', CRIME: '🦹', DISASTER: '🌊', HELP: '🆘',
};

const steps = [
  { status: 'ACKNOWLEDGED', label: '✅ Tahu', bg: 'bg-[hsl(var(--warning-yellow))]' },
  { status: 'EN_ROUTE', label: '🔵 Menuju', bg: 'bg-[hsl(var(--info-blue))]' },
  { status: 'ARRIVED', label: '🟢 Tiba', bg: 'bg-[hsl(var(--success))]' },
];

const AlertDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [alert, setAlert] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [responders, setResponders] = useState<any[]>([]);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [chatCount, setChatCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const fetchAlert = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('alerts').select('*').eq('id', id).single();
    if (data) setAlert(data);
  }, [id]);

  const fetchResponders = useCallback(async () => {
    if (!id || !user) return;
    const { data } = await supabase
      .from('alert_responders' as any)
      .select('*')
      .eq('alert_id', id);
    if (data) {
      // Fetch user names
      const userIds = (data as any[]).map((r: any) => r.user_id);
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, role')
          .in('id', userIds);
        const userMap: Record<string, any> = {};
        (users || []).forEach((u: any) => { userMap[u.id] = u; });
        setResponders((data as any[]).map((r: any) => ({ ...r, user: userMap[r.user_id] })));
      } else {
        setResponders([]);
      }
      const mine = (data as any[]).find((r: any) => r.user_id === user.id);
      setMyStatus(mine?.status || null);
    }
  }, [id, user]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('alert_id', id)
      .order('sent_at', { ascending: true });

    if (data) {
      // Fetch sender info
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, name, role')
        .in('id', senderIds);
      const userMap: Record<string, any> = {};
      (users || []).forEach((u: any) => { userMap[u.id] = u; });
      setMessages(data.map((m: any) => ({ ...m, sender: userMap[m.sender_id] })));
      setChatCount(data.length);
      scrollToBottom();
    }
  }, [id]);

  useEffect(() => {
    fetchAlert();
    fetchResponders();
    fetchMessages();

    const channel = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `alert_id=eq.${id}`
      }, async (payload) => {
        const { data: sender } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('id', payload.new.sender_id)
          .single();
        setMessages(prev => [...prev, { ...payload.new, sender }]);
        setChatCount(prev => prev + 1);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchAlert, fetchResponders, fetchMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user || !id) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    await supabase.from('chat_messages').insert({
      alert_id: id,
      sender_id: user.id,
      message: text,
    });
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const updateMyStatus = async (newStatus: string) => {
    if (!user || !id) return;
    const payload: any = {
      alert_id: id,
      user_id: user.id,
      status: newStatus,
    };
    if (newStatus === 'ACKNOWLEDGED') payload.acknowledged_at = new Date().toISOString();
    if (newStatus === 'EN_ROUTE') payload.en_route_at = new Date().toISOString();
    if (newStatus === 'ARRIVED') payload.arrived_at = new Date().toISOString();

    await supabase.from('alert_responders' as any).upsert(payload, { onConflict: 'alert_id,user_id' });
    setMyStatus(newStatus);
    fetchResponders();
  };

  const timeAgo = (d: string) => {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: idLocale }); }
    catch { return ''; }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const statusLabel: Record<string, string> = {
    ACKNOWLEDGED: '✅ Tahu',
    EN_ROUTE: '🔵 Menuju',
    ARRIVED: '🟢 Tiba',
  };

  if (!alert) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => navigate('/alerts')} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {typeEmoji[alert.type] || '⚠️'} {alert.type} — {alert.severity}
          </p>
          <p className="text-xs text-muted-foreground">
            {alert.status} • {timeAgo(alert.created_at)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'info'
              ? 'border-b-2 border-[hsl(var(--emergency))] text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          INFO
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'chat'
              ? 'border-b-2 border-[hsl(var(--emergency))] text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          💬 CHAT ({chatCount})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'info' ? (
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-20 space-y-4">
          {/* Alert Info */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            {alert.address && <p className="text-sm text-foreground">📍 {alert.address}</p>}
            {alert.location && <p className="text-sm text-foreground">📍 {alert.location}</p>}
            <p className="text-sm text-foreground">👤 {alert.reporter_name || 'Unknown'}</p>
            {alert.description && (
              <p className="text-sm text-muted-foreground">📝 "{alert.description}"</p>
            )}
            <p className="text-xs text-muted-foreground">
              🕐 {timeAgo(alert.created_at)}
            </p>
          </div>

          {/* My Response */}
          {alert.status !== 'RESOLVED' && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status Respons Saya
              </p>
              <div className="flex gap-2">
                {steps.map((step) => (
                  <button
                    key={step.status}
                    onClick={() => updateMyStatus(step.status)}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                      myStatus === step.status
                        ? `${step.bg} text-foreground`
                        : 'border border-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Responders */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="mr-1 inline h-3.5 w-3.5" />
              Responder ({responders.length})
            </p>
            <div className="space-y-2">
              {responders.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {getInitials(r.user?.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{r.user?.role}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{statusLabel[r.status] || r.status}</span>
                </div>
              ))}
              {responders.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada responder</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CHAT TAB */
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-32">
            {/* System message */}
            <div className="my-3 text-center">
              <span className="text-xs italic text-muted-foreground">
                — Alert dibuat oleh {alert.reporter_name || 'Unknown'} —
              </span>
            </div>

            {messages.map((msg: any) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`mb-3 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && (
                    <span className="mb-1 ml-1 text-xs text-muted-foreground">
                      {msg.sender?.name || 'User'} · {msg.sender?.role}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? 'rounded-tr-sm bg-[hsl(var(--info-blue))]'
                        : 'rounded-tl-sm bg-secondary'
                    }`}
                  >
                    <p className={`text-sm ${isMine ? 'text-[hsl(var(--emergency-foreground))]' : 'text-foreground'}`}>
                      {msg.message}
                    </p>
                  </div>
                  <span className={`mt-1 text-xs text-muted-foreground ${isMine ? 'mr-1' : 'ml-1'}`}>
                    {format(new Date(msg.sent_at), 'HH:mm')}
                  </span>
                </div>
              );
            })}

            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada pesan. Mulai percakapan darurat.
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="fixed bottom-0 left-0 right-0 flex items-center gap-3 border-t border-border bg-card px-4 py-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan darurat..."
              className="flex-1 rounded-full border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[hsl(var(--emergency))]"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--emergency))] text-[hsl(var(--emergency-foreground))] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertDetail;
