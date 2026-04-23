'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MoodType, AvailabilityType } from '@/lib/supabase/types'

const MOODS: { value: MoodType; label: string }[] = [
  { value: 'cafe', label: 'CAFÉ' },
  { value: 'biere', label: 'BIÈRE' },
  { value: 'cine', label: 'CINÉ' },
  { value: 'restau', label: 'RESTAU' },
  { value: 'balade', label: 'BALADE' },
  { value: 'sport', label: 'SPORT' },
]

const AVAILABILITIES: { value: AvailabilityType; label: string }[] = [
  { value: 'weekday_evenings', label: 'SOIRS DE SEMAINE' },
  { value: 'weekends', label: 'WEEK-ENDS' },
  { value: 'both', label: 'LES DEUX' },
]

const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => i + 1)

const DEFAULT_CIRCLES: { name: string; type: 'proches' | 'collegues' | 'connaissances' }[] = [
  { name: 'Proches', type: 'proches' },
  { name: 'Collègues', type: 'collegues' },
  { name: 'Connaissances', type: 'connaissances' },
]

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-white"><p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">CHARGEMENT...</p></div>}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('token')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState('')
  const [lastNameInit, setLastNameInit] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedMoods, setSelectedMoods] = useState<MoodType[]>([])
  const [selectedArrondissements, setSelectedArrondissements] = useState<number[]>([])
  const [availability, setAvailability] = useState<AvailabilityType | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleMood(mood: MoodType) {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    )
  }

  function toggleArrondissement(arr: number) {
    setSelectedArrondissements((prev) =>
      prev.includes(arr) ? prev.filter((a) => a !== arr) : [...prev, arr]
    )
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastNameInit.trim() || !availability) {
      setError('Prénom, initiale et disponibilité requis.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Session expirée. Reconnecte-toi.')
      setLoading(false)
      return
    }

    let avatarUrl: string | null = null

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      first_name: firstName.trim(),
      last_name_init: lastNameInit.trim().replace('.', '').charAt(0).toUpperCase() + '.',
      avatar_url: avatarUrl,
      bio: bio.trim() || null,
      preferred_moods: selectedMoods.length > 0 ? selectedMoods : null,
      preferred_arrondissements: selectedArrondissements.length > 0 ? selectedArrondissements : null,
      usual_availability: availability,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    for (const circle of DEFAULT_CIRCLES) {
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .insert({ owner_id: user.id, name: circle.name, type: circle.type })
        .select('id')
        .single()

      if (!circleError && circleData) {
        await supabase
          .from('circle_members')
          .insert({ circle_id: circleData.id, profile_id: user.id })
      }
    }

    // Process invitation token if user arrived via an invite link
    if (invitationToken) {
      await supabase.rpc('join_via_invitation', {
        p_token: invitationToken,
        p_user_id: user.id,
      })
    }

    window.location.href = '/'
  }

  return (
    <div className="h-full overflow-y-auto bg-white px-6 py-16">
      <div className="mx-auto max-w-93.75">
        <h1 className="mb-12 text-[80px] font-black uppercase leading-none tracking-tight text-black">
          WELCO
          <br />
          ME.
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* AVATAR */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
              AVATAR
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-24 items-center justify-center border-2 border-black bg-[#F5F5F5] text-black transition-colors hover:border-[#CCFF00] overflow-hidden"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl">+</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* PRÉNOM */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
              PRÉNOM
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ton prénom"
              required
              maxLength={50}
              className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none placeholder:text-[#AAAAAA] focus:border-[#CCFF00] transition-colors"
            />
          </div>

          {/* INITIALE */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
              INITIALE DU NOM
            </label>
            <input
              type="text"
              value={lastNameInit}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-ZÀ-ÿ]/g, '').charAt(0)
                setLastNameInit(val)
              }}
              placeholder="D"
              required
              maxLength={1}
              className="w-20 border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none placeholder:text-[#AAAAAA] focus:border-[#CCFF00] transition-colors"
            />
            {lastNameInit && (
              <span className="ml-2 text-sm text-[#666666]">→ {lastNameInit.toUpperCase()}.</span>
            )}
          </div>

          {/* BIO */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
              BIO{' '}
              <span className="font-normal normal-case tracking-normal text-[#AAAAAA]">
                (optionnel)
              </span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="TELL THE WORLD..."
              maxLength={100}
              rows={3}
              className="w-full resize-none border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none placeholder:text-[#AAAAAA] focus:border-[#CCFF00] transition-colors"
            />
            <p className="mt-1 text-right text-xs text-[#AAAAAA]">{bio.length}/100</p>
          </div>

          {/* VIBES */}
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-[#666666]">
              VIBES (SÉLECTIONNE TES ENVIES)
            </label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => {
                const selected = selectedMoods.includes(mood.value)
                return (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => toggleMood(mood.value)}
                    className={`border-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                      selected
                        ? 'border-black bg-[#CCFF00] text-black'
                        : 'border-black bg-white text-black hover:bg-[#F5F5F5]'
                    }`}
                  >
                    {mood.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ARRONDISSEMENTS */}
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-[#666666]">
              ARRONDISSEMENTS PRÉFÉRÉS
            </label>
            <div className="flex flex-wrap gap-2">
              {ARRONDISSEMENTS.map((arr) => {
                const selected = selectedArrondissements.includes(arr)
                return (
                  <button
                    key={arr}
                    type="button"
                    onClick={() => toggleArrondissement(arr)}
                    className={`h-10 w-10 border-2 text-xs font-black transition-colors ${
                      selected
                        ? 'border-black bg-[#CCFF00] text-black'
                        : 'border-black bg-white text-black hover:bg-[#F5F5F5]'
                    }`}
                  >
                    {arr}
                  </button>
                )
              })}
            </div>
          </div>

          {/* DISPONIBILITÉ */}
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-[#666666]">
              DISPONIBILITÉ HABITUELLE
            </label>
            <div className="flex flex-col gap-2">
              {AVAILABILITIES.map((avail) => {
                const selected = availability === avail.value
                return (
                  <button
                    key={avail.value}
                    type="button"
                    onClick={() => setAvailability(avail.value)}
                    className={`border-2 px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                      selected
                        ? 'border-black bg-[#CCFF00] text-black'
                        : 'border-black bg-white text-black hover:bg-[#F5F5F5]'
                    }`}
                  >
                    {avail.label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs font-black uppercase tracking-wider text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !firstName || !lastNameInit || !availability}
            className="mt-4 border-2 border-black bg-[#CCFF00] px-6 py-5 text-base font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'CRÉATION...' : 'ENTRER →'}
          </button>
        </form>
      </div>
    </div>
  )
}
