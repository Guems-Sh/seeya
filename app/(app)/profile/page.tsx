'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MoodType, AvailabilityType } from '@/lib/supabase/types'

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

const MOODS = Object.keys(MOOD_LABELS) as MoodType[]

const ARRONDISSEMENT_LABELS: Record<number, string> = {
  1: '1er', 2: '2e', 3: '3e', 4: '4e', 5: '5e', 6: '6e', 7: '7e',
  8: '8e', 9: '9e', 10: '10e', 11: '11e', 12: '12e', 13: '13e', 14: '14e',
  15: '15e', 16: '16e', 17: '17e', 18: '18e', 19: '19e', 20: '20e',
}

const AVAILABILITY_LABELS: Record<AvailabilityType, string> = {
  weekday_evenings: 'SOIRS DE SEMAINE',
  weekends: 'WEEK-ENDS',
  both: 'LES DEUX',
}

interface Profile {
  id: string
  first_name: string
  last_name_init: string
  avatar_url: string | null
  bio: string | null
  preferred_moods: MoodType[] | null
  preferred_arrondissements: number[] | null
  usual_availability: AvailabilityType | null
  is_online: boolean
  location_sharing: boolean
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative h-7 w-12 border-2 transition-colors disabled:opacity-40 ${
        checked ? 'border-[#CCFF00] bg-[#CCFF00]' : 'border-[#333333] bg-[#1A1A1A]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 border-2 transition-transform ${
          checked
            ? 'translate-x-5.5 border-black bg-black'
            : 'translate-x-0.5 border-[#555555] bg-[#555555]'
        }`}
      />
    </button>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/profile')
      if (res.ok) setProfile(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  const patch = useCallback(async (updates: Partial<Profile>) => {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const updated = await res.json()
      setProfile(updated)
    }
    setSaving(false)
  }, [])

  function toggleMood(m: MoodType) {
    if (!profile) return
    const current = profile.preferred_moods ?? []
    const next = current.includes(m) ? current.filter((x) => x !== m) : [...current, m]
    setProfile({ ...profile, preferred_moods: next })
    patch({ preferred_moods: next })
  }

  function toggleArr(a: number) {
    if (!profile) return
    const current = profile.preferred_arrondissements ?? []
    const next = current.includes(a) ? current.filter((x) => x !== a) : [...current, a]
    setProfile({ ...profile, preferred_arrondissements: next })
    patch({ preferred_arrondissements: next })
  }

  function setAvailability(v: AvailabilityType) {
    if (!profile) return
    setProfile({ ...profile, usual_availability: v })
    patch({ usual_availability: v })
  }

  function toggleOnline(v: boolean) {
    if (!profile) return
    setProfile({ ...profile, is_online: v })
    patch({ is_online: v })
  }

  function toggleLocation(v: boolean) {
    if (!profile) return
    setProfile({ ...profile, location_sharing: v })
    patch({ location_sharing: v })
  }

  async function generateInvite() {
    setInviteLoading(true)
    const res = await fetch('/api/invitations', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
    if (res.ok) {
      const data = await res.json()
      setInviteUrl(data.url)
    }
    setInviteLoading(false)
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <p className="text-xs font-bold uppercase tracking-widest text-[#555555]">CHARGEMENT...</p>
      </div>
    )
  }

  if (!profile) return null

  const moods = profile.preferred_moods ?? []
  const arrs = profile.preferred_arrondissements ?? []

  return (
    <div className="h-full overflow-y-auto bg-black px-4 pb-28 pt-6">
      <div className="mx-auto max-w-93.75 flex flex-col gap-6">

        {/* Identity */}
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.first_name}
              className="h-16 w-16 rounded-full border-2 border-[#CCFF00] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#CCFF00] bg-[#1A1A1A] text-2xl font-black text-white">
              {profile.first_name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-2xl font-black uppercase text-white">
              {profile.first_name} {profile.last_name_init}
            </p>
            {profile.bio && (
              <p className="mt-0.5 text-xs text-[#999999]">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Status toggles */}
        <div className="border-2 border-[#333333] bg-[#1A1A1A]">
          <p className="border-b-2 border-[#333333] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#555555]">
            STATUT
          </p>

          <div className="flex items-center justify-between px-4 py-4 border-b border-[#222222]">
            <div>
              <p className="text-sm font-black uppercase text-white">MODE ACTIF</p>
              <p className="text-[11px] text-[#555555]">
                {profile.is_online ? 'Visible dans les matchings' : 'Hors-ligne — invisible'}
              </p>
            </div>
            <Toggle checked={profile.is_online} onChange={toggleOnline} disabled={saving} />
          </div>

          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-black uppercase text-white">LOCALISATION FLOUE</p>
              <p className="text-[11px] text-[#555555]">
                {profile.location_sharing ? 'Position floue visible sur la carte' : 'Désactivée'}
              </p>
            </div>
            <Toggle checked={profile.location_sharing} onChange={toggleLocation} disabled={saving} />
          </div>
        </div>

        {/* Moods */}
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#999999]">MOODS FAVORIS</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => toggleMood(m)}
                disabled={saving}
                className={`border-2 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 ${
                  moods.includes(m)
                    ? 'border-[#CCFF00] bg-[#CCFF00] text-black'
                    : 'border-[#333333] bg-transparent text-white hover:border-[#CCFF00]'
                }`}
              >
                {MOOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Arrondissements */}
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#999999]">QUARTIERS FAVORIS</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((a) => (
              <button
                key={a}
                onClick={() => toggleArr(a)}
                disabled={saving}
                className={`border-2 px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40 ${
                  arrs.includes(a)
                    ? 'border-[#CCFF00] bg-[#CCFF00] text-black'
                    : 'border-[#333333] bg-transparent text-[#999999] hover:border-[#CCFF00]'
                }`}
              >
                {ARRONDISSEMENT_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#999999]">DISPONIBILITÉ HABITUELLE</p>
          <div className="flex flex-col gap-2">
            {(Object.keys(AVAILABILITY_LABELS) as AvailabilityType[]).map((v) => (
              <button
                key={v}
                onClick={() => setAvailability(v)}
                disabled={saving}
                className={`border-2 px-4 py-3 text-left text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-40 ${
                  profile.usual_availability === v
                    ? 'border-[#CCFF00] bg-[#CCFF00] text-black'
                    : 'border-[#333333] bg-transparent text-white hover:border-[#CCFF00]'
                }`}
              >
                {AVAILABILITY_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        {/* Invitation */}
        <div className="border-2 border-[#333333] bg-[#1A1A1A] p-4">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#999999]">INVITER UN AMI</p>
          <p className="mb-4 text-[11px] text-[#555555]">
            Génère un lien unique — valable 7 jours.
          </p>

          {inviteUrl ? (
            <div className="flex flex-col gap-2">
              <p className="break-all border-2 border-[#333333] bg-black px-3 py-2 text-[11px] font-bold text-[#CCFF00]">
                {inviteUrl}
              </p>
              <button
                onClick={copyInvite}
                className="border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none"
              >
                {copied ? 'COPIÉ ✓' : 'COPIER LE LIEN'}
              </button>
            </div>
          ) : (
            <button
              onClick={generateInvite}
              disabled={inviteLoading}
              className="w-full border-2 border-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-[#CCFF00] transition-colors hover:bg-[#CCFF00] hover:text-black disabled:opacity-40"
            >
              {inviteLoading ? '...' : 'GÉNÉRER UN LIEN →'}
            </button>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="border-2 border-[#333333] py-4 text-xs font-black uppercase tracking-widest text-[#555555] transition-colors hover:border-red-500 hover:text-red-500"
        >
          SE DÉCONNECTER
        </button>

      </div>
    </div>
  )
}
