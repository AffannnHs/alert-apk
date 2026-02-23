import { useState } from 'react';
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

const EmergencyTypeModal = ({ open, onOpenChange }: EmergencyTypeModalProps) => {
  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState<(typeof EMERGENCY_TYPES)[0] | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected || !user) return;
    setSubmitting(true);

    let lat = user.last_lat ?? 0;
    let lng = user.last_lng ?? 0;

    // Try to get fresh GPS
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // Use last known location
    }

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

    setSubmitting(false);

    if (error) {
      toast.error('Gagal mengirim alert. Coba lagi.');
      return;
    }

    toast.success('🚨 Alert darurat terkirim!');
    setSelected(null);
    setDescription('');
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!submitting) {
      setSelected(null);
      setDescription('');
      onOpenChange(false);
    }
  };

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
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Mengirim...' : `Kirim Alert ${selected.icon}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyTypeModal;
