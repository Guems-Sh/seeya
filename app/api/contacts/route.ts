import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: circles } = await supabase
    .from('circles')
    .select('id, name, type')
    .eq('owner_id', user.id)

  if (!circles || circles.length === 0) return NextResponse.json([])

  const circleIds = circles.map((c) => c.id)

  const { data: members } = await supabase
    .from('circle_members')
    .select('circle_id, profile_id, profiles(id, first_name, last_name_init, avatar_url, is_online, preferred_moods)')
    .in('circle_id', circleIds)
    .neq('profile_id', user.id)

  if (!members || members.length === 0) return NextResponse.json([])

  type ContactEntry = {
    id: string
    first_name: string
    last_name_init: string
    avatar_url: string | null
    is_online: boolean
    preferred_moods: string[] | null
    current_mood: string | null
    circles: Array<{ id: string; name: string; type: string }>
  }

  const contactMap = new Map<string, ContactEntry>()

  for (const member of members) {
    const profile = member.profiles as unknown as Record<string, unknown> | null
    if (!profile) continue
    const id = profile.id as string
    const circle = circles.find((c) => c.id === member.circle_id)
    if (!circle) continue

    if (!contactMap.has(id)) {
      contactMap.set(id, {
        id,
        first_name: profile.first_name as string,
        last_name_init: profile.last_name_init as string,
        avatar_url: profile.avatar_url as string | null,
        is_online: profile.is_online as boolean,
        preferred_moods: profile.preferred_moods as string[] | null,
        current_mood: null,
        circles: [{ id: circle.id, name: circle.name, type: circle.type }],
      })
    } else {
      contactMap.get(id)!.circles.push({ id: circle.id, name: circle.name, type: circle.type })
    }
  }

  // Determine current active slot mood for each contact
  const contactIds = [...contactMap.keys()]
  if (contactIds.length > 0) {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const timeNow = now.toTimeString().slice(0, 5)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay()

    const { data: slots } = await supabase
      .from('slots')
      .select('user_id, moods, start_time, end_time, date, is_recurring, recurrence_days')
      .in('user_id', contactIds)
      .or(`date.eq.${today},is_recurring.eq.true`)

    for (const slot of slots ?? []) {
      const isActiveDay = slot.is_recurring
        ? (slot.recurrence_days as number[] | null)?.includes(dayOfWeek)
        : slot.date === today

      if (
        isActiveDay &&
        slot.start_time <= timeNow &&
        slot.end_time >= timeNow
      ) {
        const contact = contactMap.get(slot.user_id)
        if (contact && !contact.current_mood && (slot.moods as string[])?.length > 0) {
          contact.current_mood = (slot.moods as string[])[0]
        }
      }
    }
  }

  return NextResponse.json([...contactMap.values()])
}
