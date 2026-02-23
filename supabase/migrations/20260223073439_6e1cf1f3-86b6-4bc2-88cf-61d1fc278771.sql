
-- Drop all existing restrictive policies on users table
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_select_all" ON public.users;
DROP POLICY IF EXISTS "users_admin_update_all" ON public.users;

-- Recreate as PERMISSIVE policies
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_admin_select_all" ON public.users
  FOR SELECT
  USING (is_active_admin());

CREATE POLICY "users_admin_update_all" ON public.users
  FOR UPDATE
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- Also fix alerts policies (same issue)
DROP POLICY IF EXISTS "alerts_group_select" ON public.alerts;
DROP POLICY IF EXISTS "alerts_member_insert" ON public.alerts;
DROP POLICY IF EXISTS "alerts_creator_update" ON public.alerts;
DROP POLICY IF EXISTS "alerts_admin_all" ON public.alerts;

CREATE POLICY "alerts_admin_all" ON public.alerts
  FOR ALL USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "alerts_group_select" ON public.alerts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.status = 'ACTIVE'
      AND users.group_name = (SELECT u2.group_name FROM users u2 WHERE u2.id = alerts.triggered_by)
  ));

CREATE POLICY "alerts_member_insert" ON public.alerts
  FOR INSERT
  WITH CHECK (
    triggered_by = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.status = 'ACTIVE')
  );

CREATE POLICY "alerts_creator_update" ON public.alerts
  FOR UPDATE
  USING (triggered_by = auth.uid())
  WITH CHECK (triggered_by = auth.uid());

-- Fix chat_messages policies
DROP POLICY IF EXISTS "chat_admin_all" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_member_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_sender_insert" ON public.chat_messages;

CREATE POLICY "chat_admin_all" ON public.chat_messages
  FOR ALL USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "chat_member_select" ON public.chat_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM alerts a JOIN users u ON u.id = auth.uid()
    WHERE a.id = chat_messages.alert_id
      AND (u.role IN ('ADMIN','SUPER_ADMIN') OR u.group_name = (SELECT users.group_name FROM users WHERE users.id = a.triggered_by))
  ));

CREATE POLICY "chat_sender_insert" ON public.chat_messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Fix iot_devices policies
DROP POLICY IF EXISTS "iot_admin_all" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_group_select" ON public.iot_devices;

CREATE POLICY "iot_admin_all" ON public.iot_devices
  FOR ALL USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "iot_devices_group_select" ON public.iot_devices
  FOR SELECT
  USING (group_name IN (SELECT users.group_name FROM users WHERE users.id = auth.uid()));

-- Fix map_settings policies
DROP POLICY IF EXISTS "map_settings_admin_all" ON public.map_settings;
DROP POLICY IF EXISTS "map_settings_own" ON public.map_settings;

CREATE POLICY "map_settings_admin_all" ON public.map_settings
  FOR ALL USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "map_settings_own" ON public.map_settings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
