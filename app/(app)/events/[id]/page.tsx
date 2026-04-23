'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MoodType, ParticipantStatus } from '@/lib/supabase/types'

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

const ARRONDISSEMENT_LABELS: Record<number, string> = {
  1: '1er', 2: '2e', 3: '3e', 4: '4e', 5: '5e', 6: '6e', 7: '7e',
  8: '8e', 9: '9e', 10: '10e', 11: '11e', 12: '12e', 13: '13e', 14: '14e',
  15: '15e', 16: '16e', 17: '17e', 18: '18e', 19: '19e', 20: '20e',
}

interface Participant {
  profile_id: string
  status: ParticipantStatus
  joined_at: string
  profiles: {
    first_name: string
    last_name_init: string
    avatar_url: string | null
  } | null
}

interface EventDetail {
  id: string
  creator_id: string
  title: string | null
  mood: MoodType
  type: 'planned' | 'spontaneous'
  status: 'open' | 'confirmed' | 'cancelled'
  date: string | null
  start_time: string | null
  end_time: string | null
  arrondissement: number | null
  location_name: string | null
  location_url: string | null
  max_participants: number | null
  created_at: string
  participants: Participant[]
}

function timeRemaining(createdAt: string): string {
  const expiresAt = new Date(createdAt).getTime() + 3 * 60 * 60 * 1000
  const ms = expiresAt - Date.now()
  if (ms <= 0) return 'EXPIRÉ'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}H${m.toString().padStart(2, '0')} RESTANTES` : `${m} MIN RESTANTES`
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).toUpperCase()
}

function AvatarBubble({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-8 w-8 rounded-full border-2 border-black object-cover"
        title={name}
      />
    )
  }
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-xs font-black text-black"
      title={name}
    >
      {name.charAt(0)}
    </div>
  )
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const res = await fetch(`/api/events/${id}`)
      if (res.ok) {
        setEvent(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
          CHARGEMENT...
        </p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white gap-4">
        <p className="text-4xl font-black uppercase text-[#E5E5E5]">404.</p>
        <button onClick={() => router.back()} className="text-xs font-black uppercase tracking-widest text-black hover:text-[#888888]">
          ← RETOUR
        </button>
      </div>
    )
  }

  const isCreator = userId === event.creator_id
  const myParticipation = event.participants.find((p) => p.profile_id === userId)
  const isParticipant = !!myParticipation
  const confirmedCount = event.participants.filter((p) => p.status === 'confirmed').length
  const isFull = event.max_participants != null && confirmedCount >= event.max_participants
  const isExpired =
    event.type === 'spontaneous' &&
    new Date(event.created_at).getTime() + 3 * 60 * 60 * 1000 < Date.now()

  async function handleJoin() {
    setActionLoading(true)
    setError('')
    const res = await fetch(`/api/events/${id}/participate`, { method: 'POST' })
    if (res.ok) {
      const updated = await fetch(`/api/events/${id}`)
      if (updated.ok) setEvent(await updated.json())
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de la participation.')
    }
    setActionLoading(false)
  }

  async function handleLeave() {
    setActionLoading(true)
    setError('')
    const res = await fetch(`/api/events/${id}/participate`, { method: 'DELETE' })
    if (res.ok) {
      const updated = await fetch(`/api/events/${id}`)
      if (updated.ok) setEvent(await updated.json())
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erreur.')
    }
    setActionLoading(false)
  }

  async function handleCancel() {
    setActionLoading(true)
    setError('')
    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    if (res.ok) {
      setEvent((prev) => prev ? { ...prev, status: 'cancelled' } : prev)
    } else {
      setError('Erreur lors de l\'annulation.')
    }
    setActionLoading(false)
  }

  const confirmedParticipants = event.participants.filter((p) => p.status === 'confirmed')

  return (
    <div className="h-full overflow-y-auto bg-white px-4 pb-32 pt-6">
      <div className="mx-auto max-w-[375px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-xs font-black uppercase tracking-widest text-[#888888] hover:text-black"
          >
            ← RETOUR
          </button>
          <div className="flex gap-2">
            <span className="border-2 border-black bg-[#CCFF00] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
              {MOOD_LABELS[event.mood]}
            </span>
            <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">
              {event.type === 'planned' ? 'PLANIFIÉ' : 'MAINTENANT'}
            </span>
          </div>
        </div>

        {/* Status banner */}
        {event.status === 'cancelled' && (
          <div className="mb-6 border-2 border-red-500 bg-red-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-red-500">
              ANNULÉ
            </p>
          </div>
        )}
        {isExpired && event.status !== 'cancelled' && (
          <div className="mb-6 border-2 border-black bg-[#F5F5F5] px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-[#888888]">
              EXPIRÉ
            </p>
          </div>
        )}

        {/* Main card */}
        <div className="mb-6 border-2 border-black bg-white shadow-[4px_4px_0_0_#000] p-5">
          <h1 className="mb-4 text-3xl font-black uppercase leading-tight text-black">
            {event.title ?? MOOD_LABELS[event.mood]}
          </h1>

          {event.type === 'planned' && event.date && (
            <p className="mb-1 text-sm font-bold text-[#666666]">
              {formatDate(event.date)}
              {event.start_time && (
                <span className="text-black">
                  {' '}· {event.start_time.slice(0, 5)}
                  {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ''}
                </span>
              )}
            </p>
          )}
          {event.type === 'spontaneous' && (
            <p className="mb-1 text-sm font-black uppercase tracking-widest text-black">
              ⚡ {timeRemaining(event.created_at)}
            </p>
          )}

          {event.arrondissement && (
            <p className="mb-1 text-sm font-bold uppercase text-black">
              Paris {ARRONDISSEMENT_LABELS[event.arrondissement]}
              {event.location_name && (
                <span className="font-normal text-[#666666]"> · {event.location_name}</span>
              )}
            </p>
          )}
          {event.location_url && (
            <a
              href={event.location_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-black uppercase tracking-widest text-black underline"
            >
              VOIR LE LIEU →
            </a>
          )}
        </div>

        {/* Participants */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-[#888888]">
              PARTICIPANTS
            </p>
            <p className="text-xs font-black text-black">
              {confirmedCount}
              {event.max_participants ? `/${event.max_participants}` : ''}
            </p>
          </div>

          {confirmedParticipants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {confirmedParticipants.map((p) => (
                <AvatarBubble
                  key={p.profile_id}
                  name={
                    p.profiles
                      ? `${p.profiles.first_name} ${p.profiles.last_name_init}`
                      : '?'
                  }
                  url={p.profiles?.avatar_url ?? null}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#AAAAAA]">Aucun participant confirmé.</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 text-xs font-black uppercase tracking-wider text-red-500">{error}</p>
        )}

        {/* Actions */}
        {event.status === 'open' && !isExpired && (
          <div className="flex flex-col gap-3">
            {!isCreator && !isParticipant && (
              <button
                onClick={handleJoin}
                disabled={actionLoading || isFull}
                className="border-2 border-black bg-[#CCFF00] px-6 py-5 text-base font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading ? '...' : isFull ? 'COMPLET' : 'JOIN DROP →'}
              </button>
            )}

            {!isCreator && isParticipant && (
              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="border-2 border-black bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-black transition-colors hover:border-red-500 hover:text-red-500 disabled:opacity-40"
              >
                {actionLoading ? '...' : 'SE DÉSINSCRIRE'}
              </button>
            )}

            {isCreator && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="border-2 border-black bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-black transition-colors hover:border-red-500 hover:text-red-500 disabled:opacity-40"
              >
                {actionLoading ? '...' : "ANNULER L'ÉVÉNEMENT"}
              </button>
            )}
          </div>
        )}

        {isCreator && event.status === 'open' && (
          <p className="mt-3 text-center text-xs text-[#AAAAAA]">
            Tu es l'organisateur·rice.
          </p>
        )}
      </div>
    </div>
  )
}
