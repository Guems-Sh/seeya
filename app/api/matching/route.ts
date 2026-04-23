import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { expandSlots, findMatches, normalizeUserOrder } from '@/lib/matching'

// GET — return current user's matches (pending + confirmed, not ignored)
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      id, overlap_start, overlap_end, shared_moods, response_a, response_b,
      user_a, user_b,
      profile_a:profiles!matches_user_a_fkey (first_name, last_name_init, avatar_url),
      profile_b:profiles!matches_user_b_fkey (first_name, last_name_init, avatar_url)
    `)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('overlap_start', { ascending: true })

  if (error) {
    console.error('[matching GET]', error)
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }

  // Filter: hide matches the current user has ignored
  const visible = (matches ?? []).filter((m) => {
    if (m.user_a === user.id) return m.response_a !== 'ignored'
    return m.response_b !== 'ignored'
  })

  return NextResponse.json(visible)
}

// POST — run matching for current user against all online circle members
export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check user is online
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_online')
    .eq('id', user.id)
    .single()

  if (!profile?.is_online) {
    return NextResponse.json({ new: 0, message: 'offline' })
  }

  // Get user's own slots
  const today = new Date().toISOString().split('T')[0]
  const { data: mySlots } = await supabase
    .from('slots')
    .select('*')
    .eq('user_id', user.id)
    .or(`date.gte.${today},is_recurring.eq.true`)

  if (!mySlots || mySlots.length === 0) {
    return NextResponse.json({ new: 0, message: 'no_slots' })
  }

  // Get online circle members (excluding self)
  const { data: myCircles } = await supabase
    .from('circles')
    .select('id')
    .eq('owner_id', user.id)

  const { data: memberOfCircles } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('profile_id', user.id)

  const circleIds = [
    ...(myCircles ?? []).map((c) => c.id),
    ...(memberOfCircles ?? []).map((c) => c.circle_id),
  ]

  if (circleIds.length === 0) {
    return NextResponse.json({ new: 0, message: 'no_circles' })
  }

  const { data: members } = await supabase
    .from('circle_members')
    .select('profile_id')
    .in('circle_id', circleIds)
    .neq('profile_id', user.id)

  const memberIds = [...new Set((members ?? []).map((m) => m.profile_id))]
  if (memberIds.length === 0) {
    return NextResponse.json({ new: 0, message: 'no_members' })
  }

  // Filter: only online members
  const { data: onlineProfiles } = await supabase
    .from('profiles')
    .select('id')
    .in('id', memberIds)
    .eq('is_online', true)

  const onlineIds = (onlineProfiles ?? []).map((p) => p.id)
  if (onlineIds.length === 0) {
    return NextResponse.json({ new: 0, message: 'no_online_members' })
  }

  const myEffective = expandSlots(mySlots)
  let newCount = 0

  for (const otherId of onlineIds) {
    const { data: theirSlots } = await supabase
      .from('slots')
      .select('*')
      .eq('user_id', otherId)
      .or(`date.gte.${today},is_recurring.eq.true`)

    if (!theirSlots || theirSlots.length === 0) continue

    const theirEffective = expandSlots(theirSlots)
    const candidates = findMatches(myEffective, theirEffective)

    for (const candidate of candidates) {
      const row = normalizeUserOrder(
        user.id,
        otherId,
        candidate.slotA,
        candidate.slotB,
        candidate
      )

      const { error } = await supabase
        .from('matches')
        .upsert(row, { onConflict: 'user_a,user_b,slot_a,slot_b,overlap_start', ignoreDuplicates: true })

      if (!error) newCount++
    }
  }

  return NextResponse.json({ new: newCount })
}
