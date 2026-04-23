import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('event_participants')
    .select(`
      status,
      joined_at,
      events (
        id, title, mood, type, status, date, start_time, end_time,
        arrondissement, location_name, created_at, creator_id,
        max_participants,
        creator:profiles!events_creator_id_fkey (first_name, last_name_init)
      )
    `)
    .eq('profile_id', user.id)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('[inbox GET]', error)
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
