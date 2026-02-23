
-- 1. Fix chat_messages: restrict SELECT to users in same group as alert creator (or admins)
DROP POLICY IF EXISTS "chat_member_select" ON public.chat_messages;

CREATE POLICY "chat_member_select"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.alerts a
    INNER JOIN public.users u ON u.id = auth.uid()
    WHERE a.id = chat_messages.alert_id
      AND (u.role IN ('ADMIN', 'SUPER_ADMIN') OR u.group_name = (
        SELECT group_name FROM public.users WHERE id = a.triggered_by
      ))
  )
);

-- 2. Add member policies for alerts table
-- Allow active members to view alerts in their group
CREATE POLICY "alerts_group_select"
ON public.alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.status = 'ACTIVE'
      AND users.group_name = (
        SELECT group_name FROM public.users WHERE id = alerts.triggered_by
      )
  )
);

-- Allow active members to create alerts
CREATE POLICY "alerts_member_insert"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (
  triggered_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.status = 'ACTIVE'
  )
);

-- Allow alert creator to update their own alerts
CREATE POLICY "alerts_creator_update"
ON public.alerts
FOR UPDATE
TO authenticated
USING (triggered_by = auth.uid())
WITH CHECK (triggered_by = auth.uid());

-- 3. Add explicit SECURITY INVOKER to is_active_admin
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.status = 'ACTIVE'
      AND u.role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;
