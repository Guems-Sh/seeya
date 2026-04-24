'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CircleType } from '@/lib/supabase/types'

interface CircleMemberProfile {
  id: string
  first_name: string
  last_name_init: string
  avatar_url: string | null
  is_online: boolean
}

interface CircleMember {
  profile_id: string
  profiles: CircleMemberProfile | null
}

interface Circle {
  id: string
  name: string
  type: CircleType
  owner_id: string
  circle_members: CircleMember[]
}

function Avatar({ profile }: { profile: CircleMemberProfile }) {
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.first_name}
        className="h-9 w-9 shrink-0 rounded-full border-2 border-black object-cover"
      />
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-sm font-black text-black">
      {profile.first_name.charAt(0)}
    </div>
  )
}

function CircleCard({
  circle,
  myId,
  onMemberRemoved,
}: {
  circle: Circle
  myId: string
  onMemberRemoved: () => void
}) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const members = circle.circle_members
    .filter((m) => m.profiles && m.profile_id !== myId)
    .map((m) => m.profiles!)

  async function generateInvite() {
    setInviteLoading(true)
    setInviteError('')
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circle_id: circle.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteUrl(data.url ?? '')
      } else {
        setInviteError(data.error ?? `Erreur ${res.status}`)
      }
    } catch {
      setInviteError('Erreur réseau')
    }
    setInviteLoading(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: 'SeeYa — Rejoins mon cercle', url: inviteUrl })
    } else {
      copyLink()
    }
  }

  async function removeMember(profileId: string) {
    setRemoving(profileId)
    await fetch(`/api/circles/${circle.id}/members/${profileId}`, { method: 'DELETE' })
    setRemoving(null)
    onMemberRemoved()
  }

  return (
    <div className="border-2 border-black bg-white shadow-[4px_4px_0_0_#000]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
        <h2 className="text-xl font-black uppercase tracking-tight text-black">{circle.name}</h2>
        <span className="border-2 border-black bg-[#F5F5F5] px-2.5 py-0.5 text-xs font-black text-black">
          {members.length} membre{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Members */}
      {members.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
            Aucun membre. Invite quelqu'un !
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#E5E5E5]">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="relative">
                <Avatar profile={m} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                    m.is_online ? 'bg-[#CCFF00]' : 'bg-[#CCCCCC]'
                  }`}
                />
              </div>
              <p className="flex-1 text-sm font-black uppercase text-black">
                {m.first_name} {m.last_name_init}
              </p>
              <button
                onClick={() => removeMember(m.id)}
                disabled={removing === m.id}
                className="shrink-0 border-2 border-black p-1.5 text-[#888888] transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white disabled:opacity-40"
                aria-label="Retirer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Invite */}
      <div className="border-t-2 border-black p-4">
        {!inviteUrl ? (
          <>
            <button
              onClick={generateInvite}
              disabled={inviteLoading}
              className="w-full border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40"
            >
              {inviteLoading ? 'GÉNÉRATION...' : '+ INVITER →'}
            </button>
            {inviteError && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-500">
                {inviteError}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 break-all border-2 border-black bg-[#F5F5F5] px-3 py-2 text-[10px] font-bold text-black">
              {inviteUrl}
            </p>
            <div className="flex gap-2">
              <button
                onClick={shareLink}
                className="flex-1 border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none"
              >
                PARTAGER →
              </button>
              <button
                onClick={copyLink}
                className="border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-[#F5F5F5]"
              >
                {copied ? '✓' : 'COPIER'}
              </button>
              <button
                onClick={() => { setInviteUrl(''); setInviteError('') }}
                className="border-2 border-black px-3 py-3 text-xs font-black text-[#888888] transition-colors hover:text-black"
              >
                ✕
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/circles')
      const data = await res.json()
      if (res.ok) {
        setCircles(data)
      } else {
        setError(data.error ?? `Erreur ${res.status}`)
      }
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setMyId(user?.id ?? null))
    load()
  }, [load])

  return (
    <div className="h-full overflow-y-auto bg-white px-4 pb-32 pt-8">
      <div className="mx-auto max-w-[375px]">
        <h1 className="mb-8 text-[56px] font-black uppercase leading-none tracking-tight text-black">
          MES<br />CERCLES
        </h1>

        {loading ? (
          <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
            CHARGEMENT...
          </p>
        ) : error ? (
          <p className="text-xs font-black uppercase tracking-widest text-red-500">
            ERREUR : {error}
          </p>
        ) : circles.length === 0 ? (
          <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
            Aucun cercle.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {circles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                myId={myId ?? ''}
                onMemberRemoved={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
