import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

const patchSchema = z.object({
  response: z.enum(['accepted', 'ignored']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Fetch match to determine which side current user is
  const { data: match } = await supabase
    .from('matches')
    .select('id, user_a, user_b, response_a, response_b')
    .eq('id', id)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const isUserA = match.user_a === user.id
  const isUserB = match.user_b === user.id
  if (!isUserA && !isUserB) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const update = isUserA
    ? { response_a: parsed.data.response }
    : { response_b: parsed.data.response }

  const { data, error } = await supabase
    .from('matches')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[matching PATCH]', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }

  // Both accepted → notify both parties
  const nowA = isUserA ? parsed.data.response : match.response_a
  const nowB = isUserB ? parsed.data.response : match.response_b
  if (nowA === 'accepted' && nowB === 'accepted') {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()
    const name = myProfile?.first_name ?? 'Quelqu\'un'
    const otherId = isUserA ? match.user_b : match.user_a
    await Promise.all([
      sendPushToUser(otherId, {
        title: 'Match confirmé ! ⚡',
        body: `${name} a accepté — vous avez un créneau en commun.`,
        url: '/explore',
      }),
      sendPushToUser(user.id, {
        title: 'Match confirmé ! ⚡',
        body: 'Les deux parties ont accepté. Créez un plan !',
        url: '/explore',
      }),
    ])
  }

  return NextResponse.json(data)
}
