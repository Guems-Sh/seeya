'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { MoodType } from '@/lib/supabase/types'

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

const ARRONDISSEMENT_LABELS: Record<number, string> = {
  1: '1er', 2: '2e', 3: '3e', 4: '4e', 5: '5e', 6: '6e', 7: '7e',
  8: '8e', 9: '9e', 10: '10e', 11: '11e', 12: '12e', 13: '13e', 14: '14e',
  15: '15e', 16: '16e', 17: '17e', 18: '18e', 19: '19e', 20: '20e',
}

type ParticipationStatus = 'invited' | 'confirmed' | 'declined'

interface InboxEvent {
  participationStatus: ParticipationStatus
  joinedAt: string
  id: string
  title: string | null
  mood: MoodType
  type: 'planned' | 'spontaneous'
  status: 'open' | 'confirmed' | 'cancelled'
  date: string | null
  startTime: string | null
  endTime: string | null
  arrondissement: number | null
  locationName: string | null
  createdAt: string
  creatorId: string
  maxParticipants: number | null
  creatorFirstName: string
  creatorLastNameInit: string
}

type Tab = 'pending' | 'confirmed' | 'past'

function isPast(ev: InboxEvent): boolean {
  if (ev.status === 'cancelled') return true
  if (ev.type === 'planned' && ev.date) {
    return new Date(ev.date + 'T23:59:59') < new Date()
  }
  if (ev.type === 'spontaneous') {
    return new Date(ev.createdAt).getTime() + 3 * 60 * 60 * 1000 < Date.now()
  }
  return false
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).toUpperCase()
}

function timeRemaining(createdAt: string): string {
  const ms = new Date(createdAt).getTime() + 3 * 60 * 60 * 1000 - Date.now()
  if (ms <= 0) return 'EXPIRÉ'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}H${m.toString().padStart(2, '0')} REST.` : `${m} MIN REST.`
}

function EventCard({ ev }: { ev: InboxEvent }) {
  const past = isPast(ev)

  return (
    <Link href={`/events/${ev.id}`}>
      <div className={`border-2 bg-white p-4 transition-all hover:shadow-[4px_4px_0_0_#000] ${
        past ? 'border-black opacity-40' : 'border-black'
      }`}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="border-2 border-black bg-[#CCFF00] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
              {MOOD_LABELS[ev.mood]}
            </span>
            <span className="border-2 border-black px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
              {ev.type === 'planned' ? 'PLANIFIÉ' : 'MAINTENANT'}
            </span>
            {ev.status === 'cancelled' && (
              <span className="border-2 border-red-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-500">
                ANNULÉ
              </span>
            )}
          </div>
          {ev.participationStatus === 'invited' && !past && (
            <span className="shrink-0 border-2 border-black bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
              INVITÉ
            </span>
          )}
        </div>

        <h3 className="mb-2 text-base font-black uppercase leading-tight text-black">
          {ev.title ?? MOOD_LABELS[ev.mood]}
        </h3>

        {ev.type === 'planned' && ev.date && (
          <p className="mb-1 text-xs font-bold text-[#666666]">
            {formatDate(ev.date)}
            {ev.startTime && (
              <span className="text-black"> · {ev.startTime.slice(0, 5)}</span>
            )}
          </p>
        )}
        {ev.type === 'spontaneous' && !past && (
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-black">
            ⚡ {timeRemaining(ev.createdAt)}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#888888]">
            {ev.arrondissement ? `Paris ${ARRONDISSEMENT_LABELS[ev.arrondissement]}` : ''}
            {ev.locationName ? ` · ${ev.locationName}` : ''}
          </p>
          <p className="shrink-0 text-xs text-[#888888]">
            par {ev.creatorFirstName} {ev.creatorLastNameInit}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('confirmed')

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/inbox')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      const mapped: InboxEvent[] = data
        .filter((d: Record<string, unknown>) => d.events !== null)
        .map((d: Record<string, unknown>) => {
          const ev = d.events as Record<string, unknown>
          const creator = ev.creator as Record<string, string> | null
          return {
            participationStatus: d.status as ParticipationStatus,
            joinedAt: d.joined_at as string,
            id: ev.id as string,
            title: ev.title as string | null,
            mood: ev.mood as MoodType,
            type: ev.type as 'planned' | 'spontaneous',
            status: ev.status as 'open' | 'confirmed' | 'cancelled',
            date: ev.date as string | null,
            startTime: ev.start_time as string | null,
            endTime: ev.end_time as string | null,
            arrondissement: ev.arrondissement as number | null,
            locationName: ev.location_name as string | null,
            createdAt: ev.created_at as string,
            creatorId: ev.creator_id as string,
            maxParticipants: ev.max_participants as number | null,
            creatorFirstName: creator?.first_name ?? '',
            creatorLastNameInit: creator?.last_name_init ?? '',
          }
        })
      setItems(mapped)
      setLoading(false)
    }
    load()
  }, [])

  const pending = items.filter((e) => e.participationStatus === 'invited' && !isPast(e))
  const confirmed = items.filter((e) => e.participationStatus === 'confirmed' && !isPast(e))
  const past = items.filter((e) => isPast(e))

  const tabItems = tab === 'pending' ? pending : tab === 'confirmed' ? confirmed : past

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'pending', label: 'PENDING', count: pending.length },
    { key: 'confirmed', label: 'CONFIRMED', count: confirmed.length },
    { key: 'past', label: 'PAST', count: past.length },
  ]

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b-2 border-black bg-white px-4 pt-6">
        <h1 className="mb-5 text-[40px] font-black uppercase leading-none tracking-tight text-black">
          INBOX
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 pb-4">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                tab === key
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-[#F5F5F5]'
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1">({count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-28 pt-4">
        {loading ? (
          <p className="pt-12 text-center text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
            CHARGEMENT...
          </p>
        ) : tabItems.length === 0 ? (
          <div className="pt-16 text-center">
            <p className="text-4xl font-black text-[#E5E5E5]">
              {tab === 'pending' ? '0' : tab === 'confirmed' ? '✓' : '—'}
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
              {tab === 'pending'
                ? 'Aucune invitation en attente'
                : tab === 'confirmed'
                ? 'Aucun plan confirmé'
                : 'Aucun plan passé'}
            </p>
            {tab !== 'past' && (
              <Link
                href="/"
                className="mt-6 inline-block border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors"
              >
                VOIR LA CARTE →
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tabItems.map((ev) => (
              <EventCard key={ev.id} ev={ev} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
