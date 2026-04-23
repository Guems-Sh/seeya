import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: circles, error } = await supabase
    .from('circles')
    .select(`
      id, name, type, owner_id, created_at,
      circle_members (
        profile_id,
        profiles (
          id, first_name, last_name_init, avatar_url,
          is_online, preferred_moods, preferred_arrondissements, usual_availability
        )
      )
    `)
    .order('created_at')

  if (error) {
    console.error('[circles GET]', error)
    return NextResponse.json({ error: 'Failed to fetch circles' }, { status: 500 })
  }

  return NextResponse.json(circles ?? [])
}
