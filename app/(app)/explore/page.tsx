'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { MoodType } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

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

function AvatarBubble({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img src={url} alt={name}
        className="h-10 w-10 rounded-full border-2 border-black object-cover" />
    )
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-sm font-black text-black">
      {name.charAt(0)}
    </div>
  )
}

function MatchCard({
  match,
  myId,
  onRespond,
}: {
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
        <AvatarBubble name={confirmed ? otherName : '?'} url={confirmed ? (other?.avatar_url ?? null) : null} />
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

export default function ExplorePage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)

  const loadMatches = useCallback(async () => {
    const res = await fetch('/api/matching')
    if (res.ok) setMatches(await res.json())
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setMyId(user?.id ?? null)
      await loadMatches()
      setLoading(false)
    }
    init()
  }, [loadMatches])

  async function runMatching() {
    setRunning(true)
    setRunResult(null)
    const res = await fetch('/api/matching', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      if (data.new > 0) {
        setRunResult(`${data.new} nouveau${data.new > 1 ? 'x' : ''} match${data.new > 1 ? 's' : ''} trouvé${data.new > 1 ? 's' : ''} !`)
      } else {
        setRunResult('Aucun nouveau créneau commun pour l\'instant.')
      }
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
    <div className="h-full overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 border-b-2 border-black bg-white px-4 pt-6 pb-4">
        <h1 className="mb-1 text-[40px] font-black uppercase leading-none tracking-tight text-black">
          MATCHS
        </h1>
        <p className="text-xs text-[#888888]">Créneaux en commun avec tes cercles</p>
      </div>

      <div className="px-4 pb-28 pt-4 flex flex-col gap-4">
        <button
          onClick={runMatching}
          disabled={running}
          className="w-full border-2 border-black bg-[#CCFF00] py-4 text-sm font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? 'CALCUL EN COURS...' : '⚡ CHERCHER DES MATCHS'}
        </button>

        {runResult && (
          <p className="text-xs font-black uppercase tracking-widest text-black">
            {runResult}
          </p>
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
                    <MatchCard key={m.id} match={m} myId={myId ?? ''} onRespond={handleRespond} />
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
                    <MatchCard key={m.id} match={m} myId={myId ?? ''} onRespond={handleRespond} />
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
    </div>
  )
}
