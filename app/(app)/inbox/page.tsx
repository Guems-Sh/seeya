'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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

// ── EVENTS ─────────────────────────────────────────────

type ParticipationStatus = 'invited' | 'confirmed' | 'declined'
type EventTab = 'pending' | 'confirmed' | 'past'

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

function EventsSection() {
  const [items, setItems] = useState<InboxEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<EventTab>('pending')

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

  const TABS: { key: EventTab; label: string; count: number }[] = [
    { key: 'pending', label: 'INVITÉS', count: pending.length },
    { key: 'confirmed', label: 'CONFIRMÉS', count: confirmed.length },
    { key: 'past', label: 'PASSÉS', count: past.length },
  ]

  return (
    <>
      <div className="flex gap-2 px-4 py-3 border-b-2 border-black overflow-x-auto no-scrollbar">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
              tab === key ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F5F5F5]'
            }`}
          >
            {label}
            {count > 0 && <span className="ml-1">({count})</span>}
          </button>
        ))}
      </div>

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
            {tabItems.map((ev) => <EventCard key={ev.id} ev={ev} />)}
          </div>
        )}
      </div>
    </>
  )
}

// ── MATCHS ─────────────────────────────────────────────

interface MatchProfile {
  first_name: string
  last_name_init: string
  avatar_url: string | null
}

interface Match {
  id: string
  user_a: string
  user_b: string
  overlap_start: string
  overlap_end: string
  shared_moods: MoodType[]
  response_a: 'accepted' | 'ignored' | null
  response_b: 'accepted' | 'ignored' | null
  profile_a: MatchProfile | null
  profile_b: MatchProfile | null
}

function formatOverlap(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const date = s.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
  const from = s.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const to = e.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${from}–${to}`
}

function MatchCard({ match, myId, onRespond }: {
  match: Match
  myId: string
  onRespond: (id: string, r: 'accepted' | 'ignored') => void
}) {
  const isUserA = match.user_a === myId
  const myResponse = isUserA ? match.response_a : match.response_b
  const theirResponse = isUserA ? match.response_b : match.response_a
  const other = isUserA ? match.profile_b : match.profile_a
  const otherName = other ? `${other.first_name} ${other.last_name_init}` : '?'
  const confirmed = match.response_a === 'accepted' && match.response_b === 'accepted'

  return (
    <div className={`border-2 bg-white p-4 ${
      confirmed ? 'border-black shadow-[4px_4px_0_0_#CCFF00]' : 'border-black'
    }`}>
      {confirmed && (
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-black">
          ✓ MATCH CONFIRMÉ
        </p>
      )}

      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-sm font-black text-black">
          {confirmed && other ? other.first_name.charAt(0) : '?'}
        </div>
        <div>
          <p className="text-sm font-black uppercase text-black">
            {confirmed ? otherName : '— · —'}
          </p>
          <p className="text-xs text-[#888888]">
            {confirmed ? 'Disponible au même moment' : 'Quelqu\'un partage ton créneau'}
          </p>
        </div>
      </div>

      <p className="mb-2 text-xs font-black uppercase tracking-widest text-black">
        {formatOverlap(match.overlap_start, match.overlap_end)}
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {match.shared_moods.map((m) => (
          <span key={m} className="border-2 border-black bg-[#CCFF00] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
            {MOOD_LABELS[m]}
          </span>
        ))}
      </div>

      {!confirmed && myResponse === null && (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(match.id, 'accepted')}
            className="flex-1 border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none"
          >
            CHAUD →
          </button>
          <button
            onClick={() => onRespond(match.id, 'ignored')}
            className="border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-red-500 hover:border-red-500 hover:text-white"
          >
            PASS
          </button>
        </div>
      )}

      {!confirmed && myResponse === 'accepted' && theirResponse === null && (
        <p className="text-xs font-black uppercase tracking-widest text-[#888888]">
          EN ATTENTE DE L'AUTRE...
        </p>
      )}

      {confirmed && (
        <Link
          href="/create"
          className="block w-full border-2 border-black bg-[#CCFF00] py-3 text-center text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white"
        >
          CRÉER UN EVENT →
        </Link>
      )}
    </div>
  )
}

function MatchsSection({ myId }: { myId: string }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)

  const loadMatches = useCallback(async () => {
    const res = await fetch('/api/matching')
    if (res.ok) setMatches(await res.json())
  }, [])

  useEffect(() => {
    loadMatches().then(() => setLoading(false))
  }, [loadMatches])

  async function runMatching() {
    setRunning(true)
    setRunResult(null)
    const res = await fetch('/api/matching', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setRunResult(
        data.new > 0
          ? `${data.new} nouveau${data.new > 1 ? 'x' : ''} match${data.new > 1 ? 's' : ''} !`
          : 'Aucun nouveau créneau commun pour l\'instant.'
      )
      await loadMatches()
    }
    setRunning(false)
  }

  async function handleRespond(id: string, response: 'accepted' | 'ignored') {
    await fetch(`/api/matching/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    })
    await loadMatches()
  }

  const pending = matches.filter((m) => {
    const myRes = m.user_a === myId ? m.response_a : m.response_b
    return myRes === null
  })
  const confirmed = matches.filter((m) => m.response_a === 'accepted' && m.response_b === 'accepted')

  return (
    <div className="px-4 pb-28 pt-4 flex flex-col gap-4">
      <button
        onClick={runMatching}
        disabled={running}
        className="w-full border-2 border-black bg-[#CCFF00] py-4 text-sm font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {running ? 'CALCUL EN COURS...' : '⚡ CHERCHER DES MATCHS'}
      </button>

      {runResult && (
        <p className="text-xs font-black uppercase tracking-widest text-black">{runResult}</p>
      )}

      {loading ? (
        <p className="pt-8 text-center text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
          CHARGEMENT...
        </p>
      ) : (
        <>
          {confirmed.length > 0 && (
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-black">
                CONFIRMÉS ({confirmed.length})
              </p>
              <div className="flex flex-col gap-3">
                {confirmed.map((m) => (
                  <MatchCard key={m.id} match={m} myId={myId} onRespond={handleRespond} />
                ))}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#888888]">
                EN ATTENTE ({pending.length})
              </p>
              <div className="flex flex-col gap-3">
                {pending.map((m) => (
                  <MatchCard key={m.id} match={m} myId={myId} onRespond={handleRespond} />
                ))}
              </div>
            </div>
          )}

          {confirmed.length === 0 && pending.length === 0 && (
            <div className="pt-12 text-center">
              <p className="text-4xl font-black text-[#E5E5E5]">0</p>
              <p className="mt-3 text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
                Aucun créneau commun trouvé
              </p>
              <p className="mt-2 text-[11px] text-[#CCCCCC]">
                Ajoute des créneaux et clique sur "Chercher des matchs"
              </p>
              <Link
                href="/slots"
                className="mt-6 inline-block border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors"
              >
                MES CRÉNEAUX →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── PAGE ─────────────────────────────────────────────

type Section = 'events' | 'matchs'

export default function InboxPage() {
  const [section, setSection] = useState<Section>('events')
  const [myId, setMyId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setMyId(user?.id ?? null))
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 border-b-2 border-black bg-white px-4 pt-6 pb-0">
        <h1 className="mb-4 text-[40px] font-black uppercase leading-none tracking-tight text-black">
          ACTIVITÉ
        </h1>
        <div className="flex gap-0 border-b-0">
          {(['events', 'matchs'] as Section[]).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`border-2 border-b-0 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                section === s
                  ? 'border-black bg-white text-black'
                  : 'border-transparent bg-white text-[#AAAAAA] hover:text-black'
              }`}
            >
              {s === 'events' ? 'EVENTS' : 'MATCHS'}
            </button>
          ))}
        </div>
      </div>

      {section === 'events' && <EventsSection />}
      {section === 'matchs' && myId && <MatchsSection myId={myId} />}
      {section === 'matchs' && !myId && (
        <div className="px-4 pt-8 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">CHARGEMENT...</p>
        </div>
      )}
    </div>
  )
}
