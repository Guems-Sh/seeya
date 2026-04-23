'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
        <img src={url} alt={name} className="h-12 w-12 rounded-full border-2 border-black object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-sm font-black text-black">
          {name.charAt(0)}
        </div>
      )}
      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${online ? 'bg-[#CCFF00]' : 'bg-[#CCCCCC]'}`} />
    </div>
  )
}

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [circle, setCircle] = useState<Circle | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/circles')
    if (res.ok) {
      const circles: Circle[] = await res.json()
      const found = circles.find((c) => c.id === id) ?? null
      setCircle(found)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function removeMember(profileId: string) {
    if (!circle) return
    setRemoving(profileId)
    await fetch(`/api/circles/${id}/members/${profileId}`, { method: 'DELETE' })
    await load()
    setRemoving(null)
  }

  async function generateInvite() {
    setInviteLoading(true)
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circle_id: id }),
    })
    const data = await res.json()
    setInviteUrl(data.url)
    setInviteLoading(false)
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">CHARGEMENT...</p>
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-white">
        <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">CERCLE INTROUVABLE</p>
        <button onClick={() => router.back()} className="text-xs font-black uppercase text-black underline">← RETOUR</button>
      </div>
    )
  }

  const members = circle.circle_members.map((m) => m.profiles).filter(Boolean) as MemberProfile[]
  const onlineCount = members.filter((m) => m.is_online).length

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 border-b-2 border-black bg-white px-4 pt-6 pb-4">
        <button onClick={() => router.back()} className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#888888] hover:text-black">
          ← CERCLES
        </button>
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#888888]">
          {CIRCLE_TYPE_LABELS[circle.type]}
        </p>
        <h1 className="text-[32px] font-black uppercase leading-none tracking-tight text-black">
          {circle.name}
        </h1>
        <p className="mt-1 text-[11px] text-[#888888]">
          {members.length} membre{members.length !== 1 ? 's' : ''} · {onlineCount} en ligne
        </p>
      </div>

      <div className="px-4 pb-28 pt-4 space-y-4">
        {/* Member list */}
        <div className="border-2 border-black">
          {members.length === 0 ? (
            <p className="px-4 py-6 text-xs text-[#AAAAAA] text-center">Aucun membre. Invite quelqu'un !</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 border-b border-[#E5E5E5] px-4 py-3 last:border-b-0">
                <Link href={`/circles/friend/${m.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                  <Avatar name={m.first_name} url={m.avatar_url} online={m.is_online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase text-black">
                      {m.first_name} {m.last_name_init}
                    </p>
                    <p className="text-[10px] text-[#888888]">
                      {m.is_online ? 'EN LIGNE' : 'HORS LIGNE'}
                    </p>
                    {m.preferred_moods && m.preferred_moods.length > 0 && (
                      <p className="truncate text-[10px] text-[#888888]">
                        {m.preferred_moods.slice(0, 3).map((mood) => MOOD_LABELS[mood]).join(' · ')}
                      </p>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => removeMember(m.id)}
                  disabled={removing === m.id}
                  className="shrink-0 border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black hover:bg-red-500 hover:border-red-500 hover:text-white disabled:opacity-40 transition-colors"
                >
                  {removing === m.id ? '...' : 'RETIRER'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Invite section */}
        <div className="border-2 border-black p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#888888]">INVITER</p>
          {!inviteUrl ? (
            <button
              onClick={generateInvite}
              disabled={inviteLoading}
              className="w-full border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-60"
            >
              {inviteLoading ? 'GÉNÉRATION...' : '+ GÉNÉRER UN LIEN D\'INVITATION'}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="break-all border-2 border-black bg-[#F5F5F5] px-3 py-2 text-[11px] font-bold text-black">
                {inviteUrl}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyInvite}
                  className="flex-1 border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none"
                >
                  {copied ? 'COPIÉ ✓' : 'COPIER LE LIEN'}
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) navigator.share({ title: 'SeeYa', text: `Rejoins mon cercle ${circle.name} sur SeeYa`, url: inviteUrl })
                    else copyInvite()
                  }}
                  className="border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-colors"
                >
                  PARTAGER
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
