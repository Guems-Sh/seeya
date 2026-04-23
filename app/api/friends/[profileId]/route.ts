import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the friend's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name_init, avatar_url, bio, is_online, preferred_moods, preferred_arrondissements, usual_availability')
    .eq('id', profileId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get circles where current user is owner and this friend is a member
  const { data: sharedCircles } = await supabase
    .from('circles')
    .select('id, name, type, circle_members!inner(profile_id)')
    .eq('owner_id', user.id)
    .eq('circle_members.profile_id', profileId)

  return NextResponse.json({ profile, circles: sharedCircles ?? [] })
}
