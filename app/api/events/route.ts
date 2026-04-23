import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

const MOOD_VALUES = ['cafe', 'biere', 'cine', 'restau', 'balade', 'sport'] as const

const plannedSchema = z.object({
  type: z.literal('planned'),
  mood: z.enum(MOOD_VALUES),
  title: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date YYYY-MM-DD'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  arrondissement: z.number().int().min(1).max(20),
  location_name: z.string().max(200).optional(),
  location_url: z.string().url().optional().or(z.literal('')),
  max_participants: z.number().int().positive().optional(),
  target_circles: z.array(z.string().uuid()).min(1, 'Au moins un cercle requis'),
}).refine((d) => d.start_time < d.end_time, {
  message: 'end_time doit être après start_time',
  path: ['end_time'],
})

const spontaneousSchema = z.object({
  type: z.literal('spontaneous'),
  mood: z.enum(MOOD_VALUES),
  arrondissement: z.number().int().min(1).max(20),
  target_circles: z.array(z.string().uuid()).min(1, 'Au moins un cercle requis'),
})

const eventSchema = z.discriminatedUnion('type', [plannedSchema, spontaneousSchema])

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const mood = searchParams.get('mood')
  const arrondissement = searchParams.get('arrondissement')

  let query = supabase
    .from('events')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (mood) query = query.eq('mood', mood as 'cafe' | 'biere' | 'cine' | 'restau' | 'balade' | 'sport')
  if (arrondissement) query = query.eq('arrondissement', parseInt(arrondissement))

  const { data, error } = await query

  if (error) {
    console.error('[events GET]', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
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

  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const input = parsed.data

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      creator_id: user.id,
      type: input.type,
      mood: input.mood,
      status: 'open',
      arrondissement: input.arrondissement,
      target_circles: input.target_circles,
      ...(input.type === 'planned'
        ? {
            title: input.title ?? null,
            date: input.date,
            start_time: input.start_time,
            end_time: input.end_time,
            location_name: input.location_name ?? null,
            location_url: input.location_url || null,
            max_participants: input.max_participants ?? null,
          }
        : {}),
    })
    .select()
    .single()

  if (eventError) {
    console.error('[events POST]', eventError)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }

  // Creator is automatically a confirmed participant
  await supabase.from('event_participants').insert({
    event_id: event.id,
    profile_id: user.id,
    status: 'confirmed',
  })

  // Invite all members of target circles (excluding creator)
  const { data: members } = await supabase
    .from('circle_members')
    .select('profile_id')
    .in('circle_id', input.target_circles)
    .neq('profile_id', user.id)

  if (members && members.length > 0) {
    const unique = [...new Set(members.map((m) => m.profile_id))]
    await supabase.from('event_participants').insert(
      unique.map((profile_id) => ({
        event_id: event.id,
        profile_id,
        status: 'invited' as const,
      }))
    )

    // Spontaneous events → push to all invited members immediately
    if (input.type === 'spontaneous') {
      const { data: creator } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()
      const name = creator?.first_name ?? 'Quelqu\'un'
      const MOOD_LABELS: Record<string, string> = {
        cafe: 'café', biere: 'bière', cine: 'ciné',
        restau: 'restau', balade: 'balade', sport: 'sport',
      }
      const mood = MOOD_LABELS[input.mood] ?? input.mood
      await Promise.all(
        unique.map((uid) =>
          sendPushToUser(uid, {
            title: `⚡ ${name} lance un truc maintenant !`,
            body: `${mood.toUpperCase()} — t'es chaud ?`,
            url: `/events/${event.id}`,
          })
        )
      )
    }
  }

  return NextResponse.json(event, { status: 201 })
}
