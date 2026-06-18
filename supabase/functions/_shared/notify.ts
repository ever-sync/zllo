import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export async function notifyUserPush(
  admin: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  type: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  await admin.rpc('notify_user_push', {
    p_user: userId,
    p_title: title,
    p_body: body,
    p_type: type,
    p_data: data,
  });
}
