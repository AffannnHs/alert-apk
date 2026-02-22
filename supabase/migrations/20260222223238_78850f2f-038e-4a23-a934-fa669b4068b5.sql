
-- Fix is_active_admin() to include search_path for security
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
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

-- Add SELECT policy for authenticated members on iot_devices (group-scoped)
CREATE POLICY "iot_devices_group_select"
ON public.iot_devices
FOR SELECT
TO authenticated
USING (
  group_name IN (
    SELECT group_name FROM public.users WHERE id = auth.uid()
  )
);
