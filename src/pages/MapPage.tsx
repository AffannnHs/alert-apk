import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Locate, Layers, User, Navigation } from 'lucide-react';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const typeEmoji: Record<string, string> = {
  FIRE: '🔥', MEDICAL: '🏥', CRIME: '🦹', DISASTER: '🌊', HELP: '🆘',
};

const createIcon = (text: string, color: string, size: number) =>
  L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${Math.floor(size / 3)}px;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.5)">${text}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });

const createAlertIcon = (type: string) =>
  L.divIcon({
    html: `<div style="width:44px;height:44px;border-radius:50%;background:hsl(0 84% 60%);display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;box-shadow:0 0 16px hsl(0 84% 60%)">${typeEmoji[type] || '⚠️'}</div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });

function MapController({ myPosition, flyTo }: { myPosition: { lat: number; lng: number } | null; flyTo: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (myPosition) map.setView([myPosition.lat, myPosition.lng], 14);
  }, []); // eslint-disable-line
  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.lat, flyTo.lng], 16, { duration: 1.5 });
  }, [flyTo]); // eslint-disable-line
  return null;
}

const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

const getInitials = (name: string | null) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

type DbUser = Tables<"users">;
type MemberRow = Pick<DbUser, "id" | "name" | "role" | "status" | "last_lat" | "last_lng">;
type AlertRow = Tables<"alerts">;

const MapPage = () => {
  const user = useAuthStore((s) => s.user);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertRow[]>([]);
  const [isSatellite, setIsSatellite] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('id, name, role, status, last_lat, last_lng')
      .eq('status', 'ACTIVE')
      .not('last_lat', 'is', null)
      .neq('id', user.id);
    if (data) setMembers(data);
  }, [user]);

  const fetchAlerts = useCallback(async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'ACTIVE');
    if (data) setActiveAlerts(data);
  }, []);

  // Get my GPS
  useEffect(() => {
    if (!user) return;
    const updatePos = () => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyPosition({ lat, lng });
        await supabase.from('users').update({ last_lat: lat, last_lng: lng }).eq('id', user.id);
      }, () => {}, { enableHighAccuracy: true });
    };
    updatePos();
    const interval = setInterval(updatePos, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    fetchMembers();
    fetchAlerts();
    const interval = setInterval(() => { fetchMembers(); fetchAlerts(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchMembers, fetchAlerts]);

  const tileUrl = isSatellite
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 pb-20 lg:pb-0">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Peta Tim & Alert</h1>
            <p className="text-muted-foreground text-sm">Monitoring lokasi anggota dan alert secara realtime.</p>
        </div>
        <Badge variant="outline" className="hidden sm:flex">{members.length} anggota online</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[500px]">
         {/* Map Container - Takes 2 cols on desktop */}
         <Card className="lg:col-span-2 overflow-hidden relative border shadow-md h-[50vh] lg:h-full rounded-xl">
            <MapContainer
              center={[-2.5, 118.0]}
              zoom={5}
              minZoom={5}
              maxZoom={18}
              maxBounds={[[-12, 94], [8, 142]]}
              maxBoundsViscosity={1.0}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <TileLayer url={tileUrl} attribution="Tiles © Esri / OSM" />
                <MapController myPosition={myPosition} flyTo={flyTo} />

                {/* My marker */}
                {myPosition && (
                    <Marker position={[myPosition.lat, myPosition.lng]} icon={createIcon('📍', 'hsl(217 91% 60%)', 44)}>
                    <Popup><div className="text-sm font-semibold">{user?.name}<br /><span className="text-xs text-muted-foreground">Anda</span></div></Popup>
                    </Marker>
                )}

                {/* Members */}
                {members.map((m) => m.last_lat && m.last_lng && (
                    <Marker
                    key={m.id}
                    position={[m.last_lat, m.last_lng]}
                    icon={createIcon(getInitials(m.name), m.role === 'COORDINATOR' ? 'hsl(217 91% 60%)' : 'hsl(142 71% 45%)', 36)}
                    >
                    <Popup><div className="text-sm"><b>{m.name}</b><br /><span className="text-xs">{m.role}</span></div></Popup>
                    </Marker>
                ))}

                {/* Active alerts */}
                {activeAlerts.map((a) => a.lat && a.lng && (
                    <Marker key={a.id} position={[a.lat, a.lng]} icon={createAlertIcon(a.type)}>
                    <Popup>
                        <div className="text-sm">
                        <b style={{ color: 'hsl(0 84% 60%)' }}>⚠️ {a.type}</b><br />
                        <span>{a.severity}</span><br />
                        <span className="text-xs">{a.description || ''}</span>
                        </div>
                    </Popup>
                    </Marker>
                ))}
            </MapContainer>
            
            {/* Controls overlay */}
            <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-2">
                <Button size="icon" variant="secondary" className="shadow-lg rounded-full h-12 w-12" onClick={() => myPosition && setFlyTo({ ...myPosition })}>
                    <Locate className="h-6 w-6" />
                </Button>
                <Button size="icon" variant={isSatellite ? "default" : "secondary"} className="shadow-lg rounded-full h-12 w-12" onClick={() => setIsSatellite(!isSatellite)}>
                    <Layers className="h-6 w-6" />
                </Button>
            </div>
         </Card>

         {/* Sidebar List - Takes 1 col on desktop */}
         <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" /> Anggota Online
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                         {members.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8 text-sm">
                                Tidak ada anggota online lain.
                            </div>
                         ) : (
                             members.map((m) => (
                                <div
                                  key={m.id}
                                  onClick={() => m.last_lat && setFlyTo({ lat: m.last_lat, lng: m.last_lng })}
                                  className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent transition-colors group"
                                >
                                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-foreground ring-2 ring-transparent group-hover:ring-primary/20 transition-all ${
                                    m.role === 'COORDINATOR' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {getInitials(m.name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                                    <p className="text-xs text-muted-foreground">{m.role}</p>
                                  </div>
                                  {myPosition && m.last_lat && (
                                    <div className="flex flex-col items-end">
                                        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                                            <Navigation className="h-3 w-3" />
                                            {calcDistance(myPosition.lat, myPosition.lng, m.last_lat, m.last_lng)} km
                                        </span>
                                    </div>
                                  )}
                                </div>
                              ))
                         )}
                    </div>
                </ScrollArea>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};

export default MapPage;
