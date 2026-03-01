import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
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

const MapPage = () => {
  const user = useAuthStore((s) => s.user);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [isSatellite, setIsSatellite] = useState(true);

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
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-lg font-bold text-foreground">🗺️ Peta Tim</h1>
        <p className="text-xs text-muted-foreground">
          {members.length} anggota • diperbarui 30 dtk
        </p>
      </div>

      {/* Map */}
      <div className="relative mx-3">
        <MapContainer
          center={[-2.5, 118.0]}
          zoom={5}
          minZoom={5}
          maxZoom={18}
          maxBounds={[[-12, 94], [8, 142]]}
          maxBoundsViscosity={1.0}
          style={{ height: '60vh', width: '100%', borderRadius: '0.75rem' }}
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
          {members.map((m: any) => m.last_lat && m.last_lng && (
            <Marker
              key={m.id}
              position={[m.last_lat, m.last_lng]}
              icon={createIcon(getInitials(m.name), m.role === 'COORDINATOR' ? 'hsl(217 91% 60%)' : 'hsl(142 71% 45%)', 36)}
            >
              <Popup><div className="text-sm"><b>{m.name}</b><br /><span className="text-xs">{m.role}</span></div></Popup>
            </Marker>
          ))}

          {/* Active alerts */}
          {activeAlerts.map((a: any) => a.lat && a.lng && (
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

        {/* FAB */}
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => myPosition && setFlyTo({ ...myPosition })}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-lg shadow-lg"
          >
            📍
          </button>
          <button
            onClick={() => setIsSatellite(!isSatellite)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-lg shadow-lg"
          >
            🛰️
          </button>
        </div>
      </div>

      {/* Member list */}
      <div className="mx-5 mt-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Anggota Online</h2>
        <div className="max-h-[40vh] overflow-y-auto space-y-2">
          {members.map((m: any) => (
            <div
              key={m.id}
              onClick={() => m.last_lat && setFlyTo({ lat: m.last_lat, lng: m.last_lng })}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-secondary transition-colors"
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-foreground ${
                m.role === 'COORDINATOR' ? 'bg-[hsl(var(--info-blue))]/20' : 'bg-[hsl(var(--success))]/20'
              }`}>
                {getInitials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
              {myPosition && m.last_lat && (
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {calcDistance(myPosition.lat, myPosition.lng, m.last_lat, m.last_lng)} km
                </span>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada anggota online</p>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default MapPage;
