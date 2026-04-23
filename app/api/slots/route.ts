import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const MOOD_VALUES = ['cafe', 'biere', 'cine', 'restau', 'balade', 'sport'] as const

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date YYYY-MM-DD requis'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format heure HH:MM requis'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format heure HH:MM requis'),
  moods: z.array(z.enum(MOOD_VALUES)).min(1, 'Au moins un mood requis'),
  is_recurring: z.boolean().default(false),
  recurrence_days: z.array(z.number().int().min(1).max(7)).optional(),
}).refine(
  (d) => d.start_time < d.end_time,
  { message: 'end_time doit être après start_time', path: ['end_time'] }
)

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .or(`date.gte.${today},is_recurring.eq.true`)
    .order('date')
    .order('start_time')

  if (error) {
    console.error('[slots GET]', error)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
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

  const parsed = slotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('slots')
    .insert({
      user_id: user.id,
      ...parsed.data,
    })
    .select()
    .single()

  if (error) {
    console.error('[slots POST]', error)
    return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
