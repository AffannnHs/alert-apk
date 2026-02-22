CREATE POLICY "chat_member_select" ON public.chat_messages
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);