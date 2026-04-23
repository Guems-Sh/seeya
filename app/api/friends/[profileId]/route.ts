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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name_init, avatar_url, bio, is_online, preferred_moods, preferred_arrondissements, usual_availability')
    .eq('id', profileId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // All circles owned by current user
  const { data: allCircles } = await supabase
    .from('circles')
    .select('id, name, type')
    .eq('owner_id', user.id)

  // Circles where friend is already a member
  const { data: friendCircles } = await supabase
    .from('circles')
    .select('id, name, type, circle_members!inner(profile_id)')
    .eq('owner_id', user.id)
    .eq('circle_members.profile_id', profileId)

  const friendCircleIds = new Set((friendCircles ?? []).map((c) => c.id))
  const availableCircles = (allCircles ?? []).filter((c) => !friendCircleIds.has(c.id))

  // Slots this week + active now
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const timeNow = now.toTimeString().slice(0, 5)
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay()

  const endOfWeek = new Date(now)
  endOfWeek.setDate(endOfWeek.getDate() + 6)
  const endDate = endOfWeek.toISOString().split('T')[0]

  const { data: weekSlots } = await supabase
    .from('slots')
    .select('id, date, start_time, end_time, moods, is_recurring, recurrence_days')
    .eq('user_id', profileId)
    .or(`and(date.gte.${today},date.lte.${endDate}),is_recurring.eq.true`)
    .order('date')
    .order('start_time')

  const currentSlot = (weekSlots ?? []).find((slot) => {
    const isActiveDay = slot.is_recurring
      ? (slot.recurrence_days as number[] | null)?.includes(dayOfWeek)
      : slot.date === today
    return isActiveDay && slot.start_time <= timeNow && slot.end_time >= timeNow
  })

  return NextResponse.json({
    profile,
    circles: friendCircles ?? [],
    available_circles: availableCircles,
    current_mood: (currentSlot?.moods as string[] | null)?.[0] ?? null,
    week_slots: weekSlots ?? [],
  })
}
