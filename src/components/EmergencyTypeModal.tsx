import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const EMERGENCY_TYPES = [
  { type: 'FIRE', icon: '🔥', label: 'Kebakaran', severity: 'HIGH' },
  { type: 'MEDICAL', icon: '🏥', label: 'Medis', severity: 'HIGH' },
  { type: 'CRIME', icon: '🚔', label: 'Kriminal', severity: 'HIGH' },
  { type: 'DISASTER', icon: '🌊', label: 'Bencana', severity: 'CRITICAL' },
  { type: 'HELP', icon: '🆘', label: 'Bantuan', severity: 'MEDIUM' },
];

interface EmergencyTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GpsStatus = 'idle' | 'checking' | 'ready' | 'error';

const isValidCoord = (lat: number, lng: number) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
};

const getPositionOnce = (options: PositionOptions) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation tidak didukung'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

const getAccuratePosition = async ({
  maxAttempts,
  maxAccuracy,
}: {
  maxAttempts: number;
  maxAccuracy: number;
}) => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const pos = await getPositionOnce({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy ?? Number.POSITIVE_INFINITY;
      if (!isValidCoord(lat, lng)) {
        lastError = new Error('Koordinat tidak valid');
        continue;
      }
      if (accuracy <= maxAccuracy) return { lat, lng, accuracy };
      lastError = new Error('Akurasi belum cukup');
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Gagal mendapatkan lokasi');
};

const EmergencyTypeModal = ({ open, onOpenChange }: EmergencyTypeModalProps) => {
  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState<(typeof EMERGENCY_TYPES)[0] | null>(null);
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<'idle' | 'locating' | 'sending'>('idle');
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const locateReqRef = useRef(0);

  const locate = useCallback(async () => {
    const reqId = ++locateReqRef.current;
    setGpsStatus('checking');
    setGpsCoords(null);
    setGpsAccuracy(null);

    try {
      const { lat, lng, accuracy } = await getAccuratePosition({ maxAttempts: 3, maxAccuracy: 100 });
      if (reqId !== locateReqRef.current) return;
      setGpsCoords({ lat, lng });
      setGpsAccuracy(accuracy);
      setGpsStatus('ready');
    } catch {
      if (reqId !== locateReqRef.current) return;
      setGpsCoords(null);
      setGpsAccuracy(null);
      setGpsStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setGpsStatus('idle');
    setGpsCoords(null);
    setGpsAccuracy(null);
  }, [open]);

  useEffect(() => {
    if (!open || !selected) return;
    void locate();
  }, [open, selected, locate]);

  const handleSubmit = async () => {
    if (!selected || !user) return;
    if (phase !== 'idle') return;

    setPhase('locating');
    const toastId = toast.loading('Mendapatkan lokasi...');

    try {
      const { lat, lng, accuracy } = await getAccuratePosition({ maxAttempts: 3, maxAccuracy: 100 });
      if (!isValidCoord(lat, lng)) {
        toast.dismiss(toastId);
        toast.error('Aktifkan GPS dan coba lagi');
        setPhase('idle');
        return;
      }

      setGpsCoords({ lat, lng });
      setGpsAccuracy(accuracy);
      setGpsStatus('ready');

      setPhase('sending');
      toast.loading('Mengirim alert...', { id: toastId });

      const { error } = await supabase.from('alerts').insert({
        type: selected.type,
        severity: selected.severity,
        description: description.trim() || null,
        lat,
        lng,
        triggered_by: user.id,
        reporter_name: user.name,
        trigger_source: 'PANIC_BUTTON',
      });

      if (error) {
        toast.dismiss(toastId);
        toast.error('Gagal mengirim alert. Coba lagi.');
        setPhase('idle');
        return;
      }

      toast.dismiss(toastId);
      toast.success('🚨 Alert darurat terkirim!');
      setSelected(null);
      setDescription('');
      onOpenChange(false);
    } catch {
      toast.dismiss(toastId);
      toast.error('Aktifkan GPS dan coba lagi');
      setGpsStatus('error');
      setPhase('idle');
    }
  };

  const handleClose = () => {
    if (phase === 'idle') {
      setSelected(null);
      setDescription('');
      onOpenChange(false);
    }
  };

  const canSend = Boolean(
    selected &&
      user &&
      phase === 'idle' &&
      gpsStatus === 'ready' &&
      gpsCoords &&
      isValidCoord(gpsCoords.lat, gpsCoords.lng),
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">
            Jenis Darurat
          </DialogTitle>
          <DialogDescription className="text-center">
            Pilih jenis keadaan darurat
          </DialogDescription>
        </DialogHeader>

        {/* Emergency type grid */}
        <div className="grid grid-cols-3 gap-3">
          {EMERGENCY_TYPES.map((et) => (
            <button
              key={et.type}
              onClick={() => setSelected(et)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${
                selected?.type === et.type
                  ? 'border-primary bg-primary/20 shadow-md'
                  : 'border-border bg-secondary hover:border-primary/50'
              }`}
            >
              <span className="text-2xl">{et.icon}</span>
              <span className="text-xs font-medium text-foreground">{et.label}</span>
            </button>
          ))}
        </div>

        {/* Description */}
        {selected && (
          <div className="space-y-2">
            <Textarea
              placeholder="Deskripsi singkat (opsional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none border-border bg-secondary text-foreground"
              maxLength={500}
            />
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                {gpsStatus === 'checking' && '📍 Mendapatkan lokasi...'}
                {gpsStatus === 'ready' &&
                  `✅ GPS aktif${gpsAccuracy != null ? ` (±${Math.round(gpsAccuracy)}m)` : ''}`}
                {gpsStatus === 'error' && '⚠️ Aktifkan GPS dan coba lagi'}
                {gpsStatus === 'idle' && '📍 Cek GPS...'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={locate}
                disabled={gpsStatus === 'checking' || phase !== 'idle'}
                className="h-7 px-2 text-xs"
              >
                Coba lagi
              </Button>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!canSend}
              className="w-full"
            >
              {phase === 'locating'
                ? 'Mendapatkan lokasi...'
                : phase === 'sending'
                  ? 'Mengirim...'
                  : `Kirim Alert ${selected.icon}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyTypeModal;
