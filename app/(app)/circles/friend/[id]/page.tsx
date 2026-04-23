'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { MoodType, CircleType } from '@/lib/supabase/types'

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

const CIRCLE_TYPE_LABELS: Record<CircleType, string> = {
  proches: 'PROCHES', collegues: 'COLLÈGUES', connaissances: 'CONNAISSANCES', custom: 'CUSTOM',
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

export default function FriendProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<FriendProfile | null>(null)
  const [circles, setCircles] = useState<FriendCircle[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/friends/${id}`)
    if (res.ok) {
      const data = await res.json()
      setProfile(data.profile)
      setCircles(data.circles)
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
        <button onClick={() => router.back()} className="text-xs font-black uppercase text-black underline">← RETOUR</button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 border-b-2 border-black bg-white px-4 pt-6 pb-4">
        <button onClick={() => router.back()} className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#888888] hover:text-black">
          ← RETOUR
        </button>
      </div>

      <div className="px-4 pb-28 pt-6 space-y-4">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.first_name} className="h-20 w-20 rounded-full border-2 border-black object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-2xl font-black text-black">
                {profile.first_name.charAt(0)}
              </div>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${profile.is_online ? 'bg-[#CCFF00]' : 'bg-[#CCCCCC]'}`} />
          </div>
          <div>
            <h1 className="text-[28px] font-black uppercase leading-none tracking-tight text-black">
              {profile.first_name}<br />{profile.last_name_init}
            </h1>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#888888]">
              {profile.is_online ? 'EN LIGNE' : 'HORS LIGNE'}
            </p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="border-2 border-black p-4">
            <p className="text-sm text-[#666666]">{profile.bio}</p>
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

        {/* Circles */}
        {circles.length > 0 && (
          <div className="border-2 border-black">
            <p className="px-4 pt-4 pb-3 text-[10px] font-black uppercase tracking-widest text-[#888888]">MES CERCLES</p>
            {circles.map((circle) => (
              <div key={circle.id} className="flex items-center justify-between border-t border-[#E5E5E5] px-4 py-3">
                <div>
                  <p className="text-sm font-black uppercase text-black">{circle.name}</p>
                  <p className="text-[10px] text-[#888888]">{CIRCLE_TYPE_LABELS[circle.type]}</p>
                </div>
                <button
                  onClick={() => removeFromCircle(circle.id)}
                  disabled={removing === circle.id}
                  className="border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black hover:bg-red-500 hover:border-red-500 hover:text-white disabled:opacity-40 transition-colors"
                >
                  {removing === circle.id ? '...' : 'RETIRER'}
                </button>
              </div>
            ))}
          </div>
        )}

        {circles.length === 0 && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-[#CCCCCC]">
            Pas dans tes cercles
          </p>
        )}
      </div>
    </div>
  )
}
