import type { MoodType } from '@/lib/supabase/types'

interface SlotRow {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  moods: MoodType[]
  is_recurring: boolean
  recurrence_days: number[] | null
}

export interface EffectiveSlot {
  slotId: string
  userId: string
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM:SS
  endTime: string    // HH:MM:SS
  moods: MoodType[]
}

export interface MatchCandidate {
  slotA: EffectiveSlot
  slotB: EffectiveSlot
  overlapStart: string  // ISO 8601
  overlapEnd: string
  sharedMoods: MoodType[]
}

// JS getDay → ISO weekday (1=Mon … 7=Sun)
function isoWeekday(d: Date): number {
  const js = d.getDay()
  return js === 0 ? 7 : js
}

function toISO(date: string): string {
  return new Date(date + 'T00:00:00').toISOString().split('T')[0]
}

function minutesToHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Expand slots into concrete (date, time) instances over the next `horizonDays` days
export function expandSlots(slots: SlotRow[], horizonDays = 14): EffectiveSlot[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result: EffectiveSlot[] = []

  for (const slot of slots) {
    if (!slot.is_recurring) {
      const slotDate = new Date(slot.date + 'T00:00:00')
      if (slotDate >= today) {
        result.push({
          slotId: slot.id,
          userId: slot.user_id,
          date: toISO(slot.date),
          startTime: slot.start_time,
          endTime: slot.end_time,
          moods: slot.moods ?? [],
        })
      }
    } else if (slot.recurrence_days && slot.recurrence_days.length > 0) {
      for (let i = 0; i < horizonDays; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        if (slot.recurrence_days.includes(isoWeekday(d))) {
          result.push({
            slotId: slot.id,
            userId: slot.user_id,
            date: d.toISOString().split('T')[0],
            startTime: slot.start_time,
            endTime: slot.end_time,
            moods: slot.moods ?? [],
          })
        }
      }
    }
  }

  return result
}

// Find all overlapping (date, time, mood) pairs between two users' slots
export function findMatches(slotsA: EffectiveSlot[], slotsB: EffectiveSlot[]): MatchCandidate[] {
  const results: MatchCandidate[] = []

  for (const a of slotsA) {
    for (const b of slotsB) {
      if (a.date !== b.date) continue

      const aStart = timeToMinutes(a.startTime)
      const aEnd = timeToMinutes(a.endTime)
      const bStart = timeToMinutes(b.startTime)
      const bEnd = timeToMinutes(b.endTime)

      const overlapStart = Math.max(aStart, bStart)
      const overlapEnd = Math.min(aEnd, bEnd)
      if (overlapStart >= overlapEnd) continue

      const sharedMoods = a.moods.filter((m) => b.moods.includes(m))
      if (sharedMoods.length === 0) continue

      results.push({
        slotA: a,
        slotB: b,
        overlapStart: `${a.date}T${minutesToHHMM(overlapStart)}`,
        overlapEnd: `${a.date}T${minutesToHHMM(overlapEnd)}`,
        sharedMoods,
      })
    }
  }

  return results
}

// Canonical ordering: always user_a < user_b so duplicates collapse
export function normalizeUserOrder(
  userId: string,
  otherId: string,
  slotSelf: EffectiveSlot,
  slotOther: EffectiveSlot,
  candidate: MatchCandidate
): {
  user_a: string
  user_b: string
  slot_a: string
  slot_b: string
  overlap_start: string
  overlap_end: string
  shared_moods: MoodType[]
} {
  const [ua, ub, sa, sb] =
    userId < otherId
      ? [userId, otherId, slotSelf.slotId, slotOther.slotId]
      : [otherId, userId, slotOther.slotId, slotSelf.slotId]

  return {
    user_a: ua,
    user_b: ub,
    slot_a: sa,
    slot_b: sb,
    overlap_start: candidate.overlapStart,
    overlap_end: candidate.overlapEnd,
    shared_moods: candidate.sharedMoods,
  }
}
