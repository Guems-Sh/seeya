import 'server-only'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  url: string
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const supabase = createServiceClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const json = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          json
        )
        .catch((err: { statusCode?: number }) => {
          // Subscription expired — clean it up
          if (err.statusCode === 410) {
            supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        })
    )
  )
}
