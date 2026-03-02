import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

const typeEmoji: Record<string, string> = {
  FIRE: '🔥', MEDICAL: '🏥', CRIME: '🦹', DISASTER: '🌊', HELP: '🆘',
};

const steps = [
  { status: 'ACKNOWLEDGED', label: '✅ Tahu', bg: 'bg-[hsl(var(--warning-yellow))]' },
  { status: 'EN_ROUTE', label: '🔵 Menuju', bg: 'bg-[hsl(var(--info-blue))]' },
  { status: 'ARRIVED', label: '🟢 Tiba', bg: 'bg-[hsl(var(--success))]' },
];

type DbUserLite = Pick<Tables<"users">, "id" | "name" | "role">;
type AlertRow = Tables<"alerts">;
type ChatMessageRow = Tables<"chat_messages">;
type AlertResponderRow = Tables<"alert_responders">;
type AlertResponderInsert = TablesInsert<"alert_responders">;
type ResponderWithUser = AlertResponderRow & { user?: DbUserLite };
type MessageWithSender = ChatMessageRow & { sender?: DbUserLite | null };

const parseDateSafe = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const AlertDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [alert, setAlert] = useState<AlertRow | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info');
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [responders, setResponders] = useState<ResponderWithUser[]>([]);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [chatCount, setChatCount] = useState(0);
  const [userCache, setUserCache] = useState<Record<string, DbUserLite>>({});
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const fetchUsers = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return userCache;
    const missing = ids.filter((uid) => !userCache[uid]);
    if (missing.length === 0) return userCache;

    const { data } = await supabase
      .from('users')
      .select('id, name, role')
      .in('id', missing);

    if (!data) return userCache;

    const map = Object.fromEntries(data.map((u) => [u.id, u])) as Record<string, DbUserLite>;
    setUserCache((prev) => ({ ...prev, ...map }));
    return { ...userCache, ...map };
  }, [userCache]);

  const fetchAlert = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('alerts').select('*').eq('id', id).single();
    if (data) setAlert(data);
  }, [id]);

  const fetchResponders = useCallback(async () => {
    if (!id || !user) return;
    const { data } = await supabase
      .from('alert_responders')
      .select('*')
      .eq('alert_id', id);
    if (data) {
      const userIds = data.map((r) => r.user_id);
      const umap = await fetchUsers(userIds);
      setResponders(data.map((r) => ({ ...r, user: umap[r.user_id] })));
      const mine = data.find((r) => r.user_id === user.id);
      setMyStatus(mine?.status || null);
    }
  }, [id, user, fetchUsers]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('alert_id', id)
      .order('sent_at', { ascending: true });
    if (error) {
      setChatError('Chat gagal dimuat. Coba lagi.');
      return;
    }
    if (data) {
      setChatError(null);
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const umap = await fetchUsers(senderIds);
      setMessages(data.map((m) => ({ ...m, sender: umap[m.sender_id] ?? null })));
      setChatCount(data.length);
      scrollToBottom();
    }
  }, [id, fetchUsers]);

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
        const newMsg = payload.new as ChatMessageRow;
        const { data: sender } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('id', newMsg.sender_id)
          .single();
        setChatError(null);
        setMessages(prev => [...prev, { ...newMsg, sender: sender ?? null }]);
        setChatCount(prev => prev + 1);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchAlert, fetchResponders, fetchMessages]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    const interval = setInterval(() => {
      void fetchMessages();
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, fetchMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user || !id) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    const { error } = await supabase.from('chat_messages').insert({
      alert_id: id,
      sender_id: user.id,
      message: text,
    });
    if (error) {
      setNewMessage(text);
    } else {
      void fetchMessages();
    }
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
    const payload: AlertResponderInsert = { alert_id: id, user_id: user.id, status: newStatus };
    if (newStatus === 'ACKNOWLEDGED') payload.acknowledged_at = new Date().toISOString();
    if (newStatus === 'EN_ROUTE') payload.en_route_at = new Date().toISOString();
    if (newStatus === 'ARRIVED') payload.arrived_at = new Date().toISOString();
    await supabase.from('alert_responders').upsert(payload, { onConflict: 'alert_id,user_id' });
    setMyStatus(newStatus);
    fetchResponders();
  };

  const timeAgo = (d: string) => {
    try {
      const parsed = parseDateSafe(d);
      if (!parsed) return '';
      return formatDistanceToNow(parsed, { addSuffix: true, locale: idLocale });
    }
    catch { return ''; }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
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
          onClick={() => { setActiveTab('chat'); setTimeout(scrollToBottom, 200); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'chat'
              ? 'border-b-2 border-[hsl(var(--emergency))] text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          💬 CHAT ({chatCount})
        </button>
      </div>

      {/* INFO TAB */}
      {activeTab === 'info' ? (
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-20 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            {alert.address && <p className="text-sm text-foreground">📍 {alert.address}</p>}
            {alert.location && <p className="text-sm text-foreground">📍 {alert.location}</p>}
            <p className="text-sm text-foreground">👤 {alert.reporter_name || 'Unknown'}</p>
            {alert.description && (
              <p className="text-sm text-muted-foreground">📝 "{alert.description}"</p>
            )}
            <p className="text-xs text-muted-foreground">🕐 {timeAgo(alert.created_at)}</p>
          </div>

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

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="mr-1 inline h-3.5 w-3.5" />
              Responder ({responders.length})
            </p>
            <div className="space-y-2">
              {responders.map((r) => (
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
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-32 space-y-1">
            {/* System message */}
            <div className="my-3 text-center">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs italic text-muted-foreground">
                Alert dibuat oleh {alert.reporter_name || 'Unknown'}
              </span>
            </div>

            {chatError && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {chatError}
              </p>
            )}

            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada pesan. Mulai percakapan darurat.
              </p>
            )}

            {messages.map((msg, index) => {
              const isMine = msg.sender_id === user?.id;
              const senderName = msg.sender?.name || 'User';
              const senderRole = msg.sender?.role || '';
              
              // Show name label only if different sender from previous message
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showName = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id);

              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-1`}>
                  {/* Sender name (only for others, only when sender changes) */}
                  {showName && (
                    <div className="flex items-center gap-1.5 mb-1 ml-10">
                      <span className="text-xs font-semibold text-foreground">{senderName}</span>
                      {senderRole && (
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {senderRole}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar (only for others) */}
                    {!isMine && (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        {getInitials(senderName)}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? 'rounded-tr-sm bg-[hsl(var(--emergency))] text-white'
                          : 'rounded-tl-sm bg-secondary text-foreground'
                      }`}
                    >
                      {/* Show own name inside bubble */}
                      {isMine && (
                        <p className="mb-0.5 text-[10px] font-semibold opacity-80">
                          {user?.name || 'Saya'}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`mt-1 text-[10px] ${isMine ? 'text-right opacity-70' : 'text-muted-foreground'}`}>
                        {(() => {
                          const parsed = parseDateSafe(msg.sent_at);
                          if (!parsed) return '';
                          try { return format(parsed, 'HH:mm'); } catch { return ''; }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="fixed bottom-0 left-0 right-0 flex items-center gap-3 border-t border-border bg-card px-4 py-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan darurat..."
              className="flex-1 rounded-full border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[hsl(var(--emergency))]"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--emergency))] text-white disabled:opacity-50 transition-opacity"
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
