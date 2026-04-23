'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { MoodType, CircleType } from '@/lib/supabase/types'

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

const DAY_LABELS: Record<number, string> = {
  1: 'LUN', 2: 'MAR', 3: 'MER', 4: 'JEU', 5: 'VEN', 6: 'SAM', 7: 'DIM',
}

const ARROND_LABEL = (n: number) => `${n}${n === 1 ? 'er' : 'e'}`

interface FriendProfile {
  id: string
  first_name: string
  last_name_init: string
  avatar_url: string | null
  bio: string | null
  is_online: boolean
  preferred_moods: MoodType[] | null
  preferred_arrondissements: number[] | null
  usual_availability: string | null
}

interface FriendCircle {
  id: string
  name: string
  type: CircleType
}

interface WeekSlot {
  id: string
  date: string | null
  start_time: string
  end_time: string
  moods: MoodType[]
  is_recurring: boolean
  recurrence_days: number[] | null
}

export default function FriendProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [profile, setProfile] = useState<FriendProfile | null>(null)
  const [circles, setCircles] = useState<FriendCircle[]>([])
  const [availableCircles, setAvailableCircles] = useState<FriendCircle[]>([])
  const [currentMood, setCurrentMood] = useState<MoodType | null>(null)
  const [weekSlots, setWeekSlots] = useState<WeekSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [showAddCircle, setShowAddCircle] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/friends/${id}`)
    if (res.ok) {
      const data = await res.json()
      setProfile(data.profile)
      setCircles(data.circles)
      setAvailableCircles(data.available_circles ?? [])
      setCurrentMood(data.current_mood ?? null)
      setWeekSlots(data.week_slots ?? [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function removeFromCircle(circleId: string) {
    if (!profile) return
    setRemoving(circleId)
    await fetch(`/api/circles/${circleId}/members/${profile.id}`, { method: 'DELETE' })
    await load()
    setRemoving(null)
  }

  async function addToCircle(circleId: string) {
    if (!profile) return
    setAdding(circleId)
    await fetch(`/api/circles/${circleId}/members/${profile.id}`, { method: 'POST' })
    await load()
    setAdding(null)
    setShowAddCircle(false)
  }

  async function removeFromAll() {
    if (!profile || circles.length === 0) return
    setDeletingAll(true)
    await Promise.all(
      circles.map((c) =>
        fetch(`/api/circles/${c.id}/members/${profile.id}`, { method: 'DELETE' })
      )
    )
    router.back()
  }

  // Group slots for display
  function getSlotsForDisplay(): Array<{ label: string; slots: WeekSlot[] }> {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const result: Array<{ label: string; slots: WeekSlot[] }> = []

    // Recurring slots grouped separately
    const recurring = weekSlots.filter((s) => s.is_recurring)
    if (recurring.length > 0) {
      result.push({ label: 'RÉCURRENTS', slots: recurring })
    }

    // One-off slots for the next 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const daySlots = weekSlots.filter((s) => !s.is_recurring && s.date === dateStr)
      if (daySlots.length > 0) {
        const label = i === 0
          ? 'AUJOURD\'HUI'
          : i === 1
          ? 'DEMAIN'
          : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()
        result.push({ label, slots: daySlots })
      }
    }

    return result
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">CHARGEMENT...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-white">
        <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">PROFIL INTROUVABLE</p>
        <button onClick={() => router.back()} className="text-xs font-black uppercase text-black underline">
          ← RETOUR
        </button>
      </div>
    )
  }

  const slotGroups = getSlotsForDisplay()

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b-2 border-black bg-white px-4 pt-4 pb-4">
        <button
          onClick={() => router.back()}
          className="text-[10px] font-black uppercase tracking-widest text-[#888888] hover:text-black"
        >
          ← RETOUR
        </button>
      </div>

      <div className="px-4 pb-28 pt-6 space-y-4">
        {/* Identity */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.first_name}
                className="h-20 w-20 rounded-full border-2 border-black object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-2xl font-black text-black">
                {profile.first_name.charAt(0)}
              </div>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${
              profile.is_online ? 'bg-[#CCFF00]' : 'bg-[#CCCCCC]'
            }`} />
          </div>

          <div className="flex-1">
            <h1 className="text-[28px] font-black uppercase leading-none tracking-tight text-black">
              {profile.first_name} {profile.last_name_init}
            </h1>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#888888]">
              {profile.is_online ? 'EN LIGNE' : 'HORS LIGNE'}
            </p>

            {/* Current mood badge */}
            {currentMood && (
              <div className="mt-2 inline-flex items-center gap-1.5 border-2 border-black bg-[#CCFF00] px-3 py-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-black">
                  ⚡ DISPO — {MOOD_LABELS[currentMood]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="border-2 border-black p-4">
            <p className="text-sm text-[#666666]">{profile.bio}</p>
          </div>
        )}

        {/* Disponibilités cette semaine */}
        {slotGroups.length > 0 && (
          <div className="border-2 border-black">
            <p className="px-4 pt-4 pb-3 text-[10px] font-black uppercase tracking-widest text-[#888888]">
              DISPONIBILITÉS CETTE SEMAINE
            </p>
            {slotGroups.map(({ label, slots }) => (
              <div key={label} className="border-t border-[#E5E5E5]">
                <p className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-[#AAAAAA]">
                  {label}
                </p>
                {slots.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-[#F5F5F5]">
                    <p className="text-sm font-black text-black">
                      {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                    </p>
                    {slot.is_recurring && slot.recurrence_days && (
                      <p className="text-[10px] text-[#888888]">
                        {slot.recurrence_days.map((d) => DAY_LABELS[d]).join(' · ')}
                      </p>
                    )}
                    <div className="ml-auto flex gap-1">
                      {(slot.moods as MoodType[]).slice(0, 2).map((mood) => (
                        <span key={mood} className="border border-black bg-[#F5F5F5] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">
                          {MOOD_LABELS[mood]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Moods */}
        {profile.preferred_moods && profile.preferred_moods.length > 0 && (
          <div className="border-2 border-black p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#888888]">AMBIANCES</p>
            <div className="flex flex-wrap gap-2">
              {profile.preferred_moods.map((mood) => (
                <span key={mood} className="border-2 border-black bg-[#CCFF00] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                  {MOOD_LABELS[mood]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Arrondissements */}
        {profile.preferred_arrondissements && profile.preferred_arrondissements.length > 0 && (
          <div className="border-2 border-black p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#888888]">QUARTIERS</p>
            <div className="flex flex-wrap gap-2">
              {profile.preferred_arrondissements.map((arr) => (
                <span key={arr} className="border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                  {ARROND_LABEL(arr)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cercles — current + add */}
        <div className="border-2 border-black">
          <p className="px-4 pt-4 pb-3 text-[10px] font-black uppercase tracking-widest text-[#888888]">
            MES CERCLES
          </p>

          {circles.length === 0 && (
            <p className="px-4 pb-4 text-xs text-[#AAAAAA]">Pas encore dans un cercle.</p>
          )}

          {circles.map((circle) => (
            <div
              key={circle.id}
              className="flex items-center justify-between border-t border-[#E5E5E5] px-4 py-3"
            >
              <p className="text-sm font-black uppercase text-black">{circle.name}</p>
              <button
                onClick={() => removeFromCircle(circle.id)}
                disabled={removing === circle.id}
                className="border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black hover:bg-red-500 hover:border-red-500 hover:text-white disabled:opacity-40 transition-colors"
              >
                {removing === circle.id ? '...' : 'RETIRER'}
              </button>
            </div>
          ))}

          {/* Add to another circle */}
          {availableCircles.length > 0 && (
            <div className="border-t border-[#E5E5E5] px-4 py-3">
              {!showAddCircle ? (
                <button
                  onClick={() => setShowAddCircle(true)}
                  className="text-[10px] font-black uppercase tracking-widest text-black hover:text-[#888888]"
                >
                  + AJOUTER À UN CERCLE
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#888888] mb-1">
                    CHOISIR UN CERCLE
                  </p>
                  {availableCircles.map((circle) => (
                    <button
                      key={circle.id}
                      onClick={() => addToCircle(circle.id)}
                      disabled={adding === circle.id}
                      className="border-2 border-black px-3 py-2 text-left text-xs font-black uppercase tracking-widest text-black hover:bg-[#CCFF00] transition-colors disabled:opacity-40"
                    >
                      {adding === circle.id ? '...' : circle.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAddCircle(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-[#AAAAAA] hover:text-black"
                  >
                    ANNULER
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danger zone */}
        {circles.length > 0 && (
          <button
            onClick={removeFromAll}
            disabled={deletingAll}
            className="w-full border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-widest text-[#888888] hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            {deletingAll ? '...' : 'SUPPRIMER DE TOUS MES CERCLES'}
          </button>
        )}
      </div>
    </div>
  )
}
