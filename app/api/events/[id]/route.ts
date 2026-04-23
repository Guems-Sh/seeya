import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const patchSchema = z.object({
  title: z.string().max(100).optional(),
  status: z.enum(['open', 'confirmed', 'cancelled']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  arrondissement: z.number().int().min(1).max(20).optional(),
  location_name: z.string().max(200).optional(),
  location_url: z.string().url().optional().or(z.literal('')),
  max_participants: z.number().int().positive().optional(),
})

export async function GET(
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

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const { data: participants } = await supabase
    .from('event_participants')
    .select('profile_id, status, joined_at, profiles(first_name, last_name_init, avatar_url)')
    .eq('event_id', id)

  return NextResponse.json({ ...event, participants: participants ?? [] })
}

export async function PATCH(
  request: NextRequest,
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

  const { data, error } = await supabase
    .from('events')
    .update(parsed.data)
    .eq('id', id)
    .eq('creator_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[events PATCH]', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }

  return NextResponse.json(data)
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

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('creator_id', user.id)

  if (error) {
    console.error('[events DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
