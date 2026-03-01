import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation, type Position } from "@capacitor/geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";

const LOCATION_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;

async function ensurePermissions() {
  await LocalNotifications.requestPermissions();
  await Geolocation.requestPermissions();
}

export function BackgroundServiceInit() {
  const watchIdRef = useRef<string | null>(null);
  const lastSyncAtRef = useRef<number>(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    const syncLocation = async (pos: Position) => {
      if (!pos?.coords) return;
      const now = Date.now();
      if (now - lastSyncAtRef.current < LOCATION_SYNC_MIN_INTERVAL_MS) return;

      const currentUser = useAuthStore.getState().user;
      if (!currentUser?.id) return;

      lastSyncAtRef.current = now;

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      await supabase
        .from("users")
        .update({ last_lat: lat, last_lng: lng, last_seen_at: new Date().toISOString() })
        .eq("id", currentUser.id);
    };

    const start = async () => {
      try {
        await ensurePermissions();
        if (cancelled) return;

        const watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
          async (pos) => {
            if (!pos || cancelled) return;
            await syncLocation(pos);
          },
        );

        watchIdRef.current = String(watchId);
      } catch {
        return;
      }
    };

    void start();

    return () => {
      cancelled = true;
      const id = watchIdRef.current;
      watchIdRef.current = null;
      if (id) {
        void Geolocation.clearWatch({ id });
      }
    };
  }, []);

  return null;
}

