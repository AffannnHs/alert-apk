

# Emergency Alert System — Implementation Plan

## Phase 1: Foundation — Auth, Theme & Navigation
- Set up dark theme color system (#0f1117 background, emergency red accents)
- Add mobile viewport meta tags for Android optimization
- Install Zustand for state management
- Create **Login page** with siren icon + red glow, email/password fields, show/hide toggle
- Create **Register page** with 5 fields (name, email, phone, password, confirm) + GPS location capture
- Create **Pending page** with refresh status functionality
- Build auth store (Zustand) with session persistence
- Create protected route wrapper with loading spinner
- Build **Bottom Navigation** (Home, Alerts, Map, Profile) fixed at bottom, 64px height

## Phase 2: Home & Panic Button
- Build **Home page** with greeting header, date, GPS mode indicator
- Create **Panic Button** — large red circle (w-44 h-44) with pulse animation
- Implement 3-second hold mechanic with SVG progress ring
- Add phone vibration on trigger completion
- Build **Emergency Type Modal** — 5 options grid (Fire, Medical, Crime, Disaster, Help)
- Description form + GPS capture → insert alert to Supabase
- Show active alerts section with real-time subscription
- Display online members with avatars

## Phase 3: Alerts List & Detail with Chat
- **Database**: Create `alert_responders` table with columns (alert_id, user_id, status, acknowledged_at, arrived_at) + RLS policies
- Build **Alerts page** with Aktif/Riwayat tabs, alert cards with severity border colors
- Build **Alert Detail page** with INFO and CHAT tabs
- INFO tab: alert details, 3-step response status buttons (Acknowledged → En Route → Arrived)
- CHAT tab: real-time messaging with left/right/system bubbles, auto-scroll, Supabase realtime subscription

## Phase 4: Team Map
- Install Leaflet + react-leaflet
- Build **Map page** with satellite tile layer (Esri), bounded to Indonesia
- Custom markers: blue (coordinator), green (member), red pulsing (active alerts)
- My position marker (larger blue)
- Member list below map with distance calculation (Haversine)
- Tap member → fly to their location on map
- Background GPS update to Supabase every 5 minutes

## Phase 5: Profile & Settings
- Build **Profile page** with avatar (initials), role badge, contact info
- Show stats from database (alerts responded, alerts triggered)
- Notification toggle (localStorage)
- Change password modal with validation
- Logout with confirmation dialog

## Phase 6: Real-time Notifications
- Request browser notification permission on login
- Global Supabase realtime listener for new alerts → browser notification + in-app banner
- In-app alert banner: slides from top, auto-dismiss 8 seconds with countdown bar
- Badge count on Alerts tab and bell icon (unacknowledged alerts)

## Phase 7: Polish & PWA
- Loading skeletons for all data-fetching screens
- Empty states with emoji illustrations
- Offline detection banner
- Pull-to-refresh on Home and Alerts
- PWA manifest + icons for "Add to Home Screen"
- Ensure all touch targets ≥ 44px, font ≥ 14px, no horizontal overflow, bottom padding for nav

