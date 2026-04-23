'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { MoodType, CircleType } from '@/lib/supabase/types'

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

const CIRCLE_TYPE_LABELS: Record<CircleType, string> = {
  proches: 'PROCHES', collegues: 'COLLÈGUES', connaissances: 'CONNAISSANCES', custom: 'CUSTOM',
}

interface MemberProfile {
  id: string
  first_name: string
  last_name_init: string
  avatar_url: string | null
  is_online: boolean
  preferred_moods: MoodType[] | null
}

interface CircleMember {
  profile_id: string
  profiles: MemberProfile | null
}

interface Circle {
  id: string
  name: string
  type: CircleType
  owner_id: string
  circle_members: CircleMember[]
}

function Avatar({ name, url, online }: { name: string; url: string | null; online: boolean }) {
  return (
    <div className="relative">
      {url ? (
        <img src={url} alt={name} className="h-9 w-9 rounded-full border-2 border-black object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-xs font-black text-black">
          {name.charAt(0)}
        </div>
      )}
      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${online ? 'bg-[#CCFF00]' : 'bg-[#CCCCCC]'}`} />
    </div>
  )
}

function InviteModal({ circleId, circleName, onClose }: { circleId: string; circleName: string; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circle_id: circleId }),
    })
      .then((r) => r.json())
      .then((d) => { setUrl(d.url); setLoading(false) })
  }, [circleId])

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: 'SeeYa', text: `Rejoins mon cercle ${circleName} sur SeeYa`, url })
    } else {
      copyLink()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full border-t-2 border-black bg-white p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#888888]">INVITATION</p>
        <h2 className="mb-6 text-2xl font-black uppercase text-black">
          INVITER DANS<br />{circleName}
        </h2>

        {loading ? (
          <p className="text-xs text-[#AAAAAA]">GÉNÉRATION...</p>
        ) : (
          <>
            <p className="mb-4 break-all border-2 border-black bg-[#F5F5F5] px-3 py-2 text-[11px] font-bold text-black">
              {url}
            </p>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none"
              >
                {copied ? 'COPIÉ ✓' : 'COPIER LE LIEN'}
              </button>
              <button
                onClick={shareLink}
                className="border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors"
              >
                PARTAGER
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CircleCard({ circle, expanded, onToggle, onInvite }: {
  circle: Circle
  expanded: boolean
  onToggle: () => void
  onInvite: () => void
}) {
  const members = circle.circle_members
    .map((m) => m.profiles)
    .filter(Boolean) as MemberProfile[]
  const onlineCount = members.filter((m) => m.is_online).length

  return (
    <div className={`border-2 bg-white transition-all ${expanded ? 'border-black shadow-[4px_4px_0_0_#CCFF00]' : 'border-black'}`}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="text-left">
          <p className="text-base font-black uppercase text-black">{circle.name}</p>
          <p className="text-[11px] text-[#888888]">
            {members.length} membre{members.length !== 1 ? 's' : ''} · {onlineCount} en ligne
          </p>
        </div>
        {!expanded && members.length > 0 && (
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m) => (
              <Avatar key={m.id} name={m.first_name} url={m.avatar_url} online={m.is_online} />
            ))}
            {members.length > 4 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-[10px] font-black text-black">
                +{members.length - 4}
              </div>
            )}
          </div>
        )}
        <span className="ml-3 text-black">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t-2 border-black">
          {members.length === 0 ? (
            <p className="px-4 py-4 text-xs text-[#AAAAAA]">Aucun membre. Invite quelqu'un !</p>
          ) : (
            <div className="flex flex-col">
              {members.map((m) => (
                <Link
                  key={m.id}
                  href={`/circles/friend/${m.id}`}
                  className="flex items-center gap-3 border-b border-[#E5E5E5] px-4 py-3 last:border-b-0 hover:bg-[#F5F5F5]"
                >
                  <Avatar name={m.first_name} url={m.avatar_url} online={m.is_online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase text-black">
                      {m.first_name} {m.last_name_init}
                    </p>
                    {m.preferred_moods && m.preferred_moods.length > 0 && (
                      <p className="truncate text-[10px] text-[#888888]">
                        {m.preferred_moods.slice(0, 3).map((mood) => MOOD_LABELS[mood]).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="text-[#CCCCCC]">›</span>
                </Link>
              ))}
            </div>
          )}

          <div className="flex gap-2 p-4">
            <button
              onClick={onInvite}
              className="flex-1 border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none"
            >
              + INVITER
            </button>
            <Link
              href={`/circles/${circle.id}`}
              className="border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors"
            >
              GÉRER
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

type TabFilter = 'tous' | CircleType

export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('tous')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [inviteCircle, setInviteCircle] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/circles')
    if (res.ok) setCircles(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'tous', label: 'TOUS' },
    { key: 'proches', label: 'PROCHES' },
    { key: 'collegues', label: 'COLLÈGUES' },
    { key: 'connaissances', label: 'CONNAISSANCES' },
  ]

  const filtered = tab === 'tous' ? circles : circles.filter((c) => c.type === tab)

  function countByType(type: CircleType) {
    return circles.filter((c) => c.type === type).reduce((acc, c) => acc + c.circle_members.length, 0)
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 border-b-2 border-black bg-white px-4 pt-6 pb-0">
        <h1 className="mb-4 text-[40px] font-black uppercase leading-none tracking-tight text-black">
          CERCLES
        </h1>
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-4">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                tab === key ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F5F5F5]'
              }`}
            >
              {label}
              {key !== 'tous' && (
                <span className="ml-1 opacity-50">({countByType(key as CircleType)})</span>
              )}
              {key === 'tous' && (
                <span className="ml-1 opacity-50">({circles.reduce((a, c) => a + c.circle_members.length, 0)})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-28 pt-4">
        {loading ? (
          <p className="pt-12 text-center text-xs font-black uppercase tracking-widest text-[#AAAAAA]">CHARGEMENT...</p>
        ) : filtered.length === 0 ? (
          <p className="pt-12 text-center text-xs font-black uppercase tracking-widest text-[#CCCCCC]">AUCUN CERCLE</p>
        ) : (
          filtered.map((circle) => (
            <CircleCard
              key={circle.id}
              circle={circle}
              expanded={expandedId === circle.id}
              onToggle={() => setExpandedId(expandedId === circle.id ? null : circle.id)}
              onInvite={() => setInviteCircle({ id: circle.id, name: circle.name })}
            />
          ))
        )}
      </div>

      {inviteCircle && (
        <InviteModal
          circleId={inviteCircle.id}
          circleName={inviteCircle.name}
          onClose={() => setInviteCircle(null)}
        />
      )}
    </div>
  )
}
