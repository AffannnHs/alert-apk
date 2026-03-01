

# Implementation Plan: Alerts + Chat + Map + Profile

## 1. Database Migration

Create `alert_responders` table (required for response tracking):

```sql
CREATE TABLE public.alert_responders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ACKNOWLEDGED',
  acknowledged_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alert_id, user_id)
);
```

With RLS policies for group-based SELECT, own INSERT/UPDATE, and admin ALL.

Also fix existing RLS: all current policies are still **RESTRICTIVE** (`Permissive: No`). They must be recreated as **PERMISSIVE** or nothing works. This migration will drop and recreate all existing policies as PERMISSIVE.

## 2. New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/AlertDetail.tsx` | Detail page with INFO + CHAT tabs, realtime chat |
| `src/pages/AlertsPage.tsx` | Rewrite of Alerts with Active/History tabs, response buttons |
| `src/pages/MapPage.tsx` | Full Leaflet map with member markers, alert markers, member list |
| `src/pages/ProfilePage.tsx` | Full profile with stats, password change, logout |

## 3. Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add route `/alerts/:id` for AlertDetail |
| `package.json` | Add `leaflet`, `react-leaflet`, `@types/leaflet` |
| `index.html` | Add Leaflet CSS link |

## 4. Implementation Summary

**Alerts Page**: Two tabs (Active/History) with realtime subscription. Each alert card shows severity border color, type emoji, reporter, time ago, and 3 response status buttons (Tahu/Menuju/Tiba) that upsert into `alert_responders`. "Lihat Chat" link navigates to detail.

**Alert Detail**: Header with back button, alert info. Two tabs — INFO (location, reporter, description, responder list from `alert_responders`) and CHAT (realtime bubble chat using `chat_messages` with Supabase realtime INSERT listener, auto-scroll, Enter-to-send).

**Map Page**: Leaflet with Esri satellite tiles, bounded to Indonesia. Custom div-icon markers for self (blue), coordinators (blue), members (green), active alerts (red+emoji). FAB buttons for recenter and tile toggle. Member list below map with Haversine distance, tap to flyTo. GPS position updated to Supabase every 5 minutes.

**Profile Page**: Avatar with initials, role badge, contact info, stats from `alerts` count + `alert_responders` count. Notification toggle (localStorage). Password change via sheet/dialog with old password verification. Logout with confirm dialog.

## 5. Technical Notes

- All RLS policies will be converted from RESTRICTIVE to PERMISSIVE in the migration to fix the access denied issues
- `alert_responders` needs a `users_select_group` policy so members can see responders in their group's alerts
- Chat messages query joins with `users` table for sender name — the existing `users_select_own` policy blocks seeing other users' names. A new policy `users_select_active_members` for SELECT by active users in the same group will be added
- Leaflet CSS loaded via CDN in index.html to avoid build issues

