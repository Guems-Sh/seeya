import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, status, max_participants, creator_id')
    .eq('id', id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.status !== 'open') {
    return NextResponse.json({ error: 'Event is not open' }, { status: 409 })
  }

  if (event.creator_id === user.id) {
    return NextResponse.json({ error: 'Creator cannot join their own event' }, { status: 409 })
  }

  if (event.max_participants) {
    const { count } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'confirmed')

    if ((count ?? 0) >= event.max_participants) {
      return NextResponse.json({ error: 'Event is full' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('event_participants')
    .upsert(
      { event_id: id, profile_id: user.id, status: 'confirmed' },
      { onConflict: 'event_id,profile_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[participate POST]', error)
    return NextResponse.json({ error: 'Failed to join event' }, { status: 500 })
  }

  // Notify creator someone joined
  const { data: joiner } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .single()
  const joinerName = joiner?.first_name ?? 'Quelqu\'un'
  await sendPushToUser(event.creator_id, {
    title: `${joinerName} rejoint ton event ! 🎉`,
    body: 'Un nouveau participant vient de confirmer.',
    url: `/events/${id}`,
  })

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: event } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', id)
    .single()

  if (event?.creator_id === user.id) {
    return NextResponse.json({ error: 'Creator cannot leave their own event' }, { status: 409 })
  }

  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', id)
    .eq('profile_id', user.id)

  if (error) {
    console.error('[participate DELETE]', error)
    return NextResponse.json({ error: 'Failed to leave event' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
