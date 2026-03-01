
-- ============================================================
-- 1. Create alert_responders table
-- ============================================================
CREATE TABLE public.alert_responders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ACKNOWLEDGED',
  acknowledged_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alert_id, user_id)
);

ALTER TABLE public.alert_responders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Create helper function for group check (avoids recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_group()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_name FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_status()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ============================================================
-- 3. Drop ALL existing RESTRICTIVE policies
-- ============================================================

-- users
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_admin_select_all ON public.users;
DROP POLICY IF EXISTS users_admin_update_all ON public.users;

-- alerts
DROP POLICY IF EXISTS alerts_admin_all ON public.alerts;
DROP POLICY IF EXISTS alerts_group_select ON public.alerts;
DROP POLICY IF EXISTS alerts_member_insert ON public.alerts;
DROP POLICY IF EXISTS alerts_creator_update ON public.alerts;

-- chat_messages
DROP POLICY IF EXISTS chat_admin_all ON public.chat_messages;
DROP POLICY IF EXISTS chat_member_select ON public.chat_messages;
DROP POLICY IF EXISTS chat_sender_insert ON public.chat_messages;

-- iot_devices
DROP POLICY IF EXISTS iot_admin_all ON public.iot_devices;
DROP POLICY IF EXISTS iot_devices_group_select ON public.iot_devices;

-- map_settings
DROP POLICY IF EXISTS map_settings_admin_all ON public.map_settings;
DROP POLICY IF EXISTS map_settings_own ON public.map_settings;

-- ============================================================
-- 4. Recreate ALL policies as PERMISSIVE
-- ============================================================

-- === USERS ===
CREATE POLICY users_insert_own ON public.users FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY users_select_own ON public.users FOR SELECT
  TO authenticated USING (id = auth.uid());

CREATE POLICY users_update_own ON public.users FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY users_admin_select_all ON public.users FOR SELECT
  TO authenticated USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE');

CREATE POLICY users_admin_update_all ON public.users FOR UPDATE
  TO authenticated USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE')
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE');

-- NEW: Allow active members to see other active members in same group (needed for chat, map, etc.)
CREATE POLICY users_select_same_group ON public.users FOR SELECT
  TO authenticated USING (
    status = 'ACTIVE'
    AND group_name = public.get_my_group()
    AND public.get_my_status() = 'ACTIVE'
  );

-- === ALERTS ===
CREATE POLICY alerts_admin_all ON public.alerts FOR ALL
  TO authenticated USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE')
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE');

CREATE POLICY alerts_group_select ON public.alerts FOR SELECT
  TO authenticated USING (
    public.get_my_status() = 'ACTIVE'
  );

CREATE POLICY alerts_member_insert ON public.alerts FOR INSERT
  TO authenticated WITH CHECK (
    triggered_by = auth.uid() AND public.get_my_status() = 'ACTIVE'
  );

CREATE POLICY alerts_creator_update ON public.alerts FOR UPDATE
  TO authenticated USING (triggered_by = auth.uid()) WITH CHECK (triggered_by = auth.uid());

-- === CHAT_MESSAGES ===
CREATE POLICY chat_admin_all ON public.chat_messages FOR ALL
  TO authenticated USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE')
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE');

CREATE POLICY chat_member_select ON public.chat_messages FOR SELECT
  TO authenticated USING (public.get_my_status() = 'ACTIVE');

CREATE POLICY chat_sender_insert ON public.chat_messages FOR INSERT
  TO authenticated WITH CHECK (sender_id = auth.uid() AND public.get_my_status() = 'ACTIVE');

-- === IOT_DEVICES ===
CREATE POLICY iot_admin_all ON public.iot_devices FOR ALL
  TO authenticated USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE')
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE');

CREATE POLICY iot_devices_group_select ON public.iot_devices FOR SELECT
  TO authenticated USING (group_name = public.get_my_group());

-- === MAP_SETTINGS ===
CREATE POLICY map_settings_admin_all ON public.map_settings FOR ALL
  TO authenticated USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE')
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE');

CREATE POLICY map_settings_own ON public.map_settings FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- === ALERT_RESPONDERS ===
CREATE POLICY responders_select ON public.alert_responders FOR SELECT
  TO authenticated USING (public.get_my_status() = 'ACTIVE');

CREATE POLICY responders_upsert ON public.alert_responders FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() AND public.get_my_status() = 'ACTIVE');

CREATE POLICY responders_update_own ON public.alert_responders FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY responders_admin_all ON public.alert_responders FOR ALL
  TO authenticated USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE')
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN') AND public.get_my_status() = 'ACTIVE');
