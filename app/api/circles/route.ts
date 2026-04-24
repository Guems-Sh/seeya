import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CircleType } from '@/lib/supabase/types'

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
    return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 })
  }

  // Auto-create default circles if user has none (e.g. onboarding completed before this logic)
  if (!circles || circles.length === 0) {
    const defaults: { name: string; type: CircleType }[] = [
      { name: 'Proches', type: 'proches' },
      { name: 'Collègues', type: 'collegues' },
      { name: 'Connaissances', type: 'connaissances' },
    ]
    for (const def of defaults) {
      const { data: created } = await supabase
        .from('circles')
        .insert({ owner_id: user.id, name: def.name, type: def.type })
        .select('id')
        .single()
      if (created) {
        await supabase.from('circle_members').insert({ circle_id: created.id, profile_id: user.id })
      }
    }
    const { data: fresh } = await supabase
      .from('circles')
      .select(`id, name, type, owner_id, created_at, circle_members(profile_id, profiles(id, first_name, last_name_init, avatar_url, is_online, preferred_moods, preferred_arrondissements, usual_availability))`)
      .order('created_at')
    return NextResponse.json(fresh ?? [])
  }

  return NextResponse.json(circles)
}
