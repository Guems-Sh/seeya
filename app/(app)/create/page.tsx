'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCircles } from '@/hooks/useCircles'
import type { MoodType } from '@/lib/supabase/types'

const MOODS: { value: MoodType; label: string }[] = [
  { value: 'cafe', label: 'CAFÉ' },
  { value: 'biere', label: 'BIÈRE' },
  { value: 'cine', label: 'CINÉ' },
  { value: 'restau', label: 'RESTAU' },
  { value: 'balade', label: 'BALADE' },
  { value: 'sport', label: 'SPORT' },
]

const ARRONDISSEMENT_LABELS: Record<number, string> = {
  1: '1er', 2: '2e', 3: '3e', 4: '4e', 5: '5e', 6: '6e', 7: '7e',
  8: '8e', 9: '9e', 10: '10e', 11: '11e', 12: '12e', 13: '13e', 14: '14e',
  15: '15e', 16: '16e', 17: '17e', 18: '18e', 19: '19e', 20: '20e',
}

type EventType = 'planned' | 'spontaneous'

export default function CreatePage() {
  const router = useRouter()
  const { circles } = useCircles()

  const today = new Date().toISOString().split('T')[0]

  const [eventType, setEventType] = useState<EventType>('planned')
  const [mood, setMood] = useState<MoodType | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('19:00')
  const [endTime, setEndTime] = useState('22:00')
  const [arrondissement, setArrondissement] = useState<number | null>(null)
  const [locationName, setLocationName] = useState('')
  const [locationUrl, setLocationUrl] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [targetCircles, setTargetCircles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleCircle(id: string) {
    setTargetCircles((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!mood) { setError('Choisis un mood.'); return }
    if (!arrondissement) { setError('Choisis un arrondissement.'); return }
    if (targetCircles.length === 0) { setError('Choisis au moins un cercle.'); return }

    setLoading(true)

    const body =
      eventType === 'planned'
        ? {
            type: 'planned',
            mood,
            title: title || undefined,
            date,
            start_time: startTime,
            end_time: endTime,
            arrondissement,
            location_name: locationName || undefined,
            location_url: locationUrl || undefined,
            max_participants: maxParticipants ? parseInt(maxParticipants) : undefined,
            target_circles: targetCircles,
          }
        : {
            type: 'spontaneous',
            mood,
            arrondissement,
            target_circles: targetCircles,
          }

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const event = await res.json()
      router.push(`/events/${event.id}`)
    } else {
      const data = await res.json()
      const msgs = data.error?.fieldErrors
        ? Object.values(data.error.fieldErrors).flat().join(' · ')
        : data.error ?? 'Erreur lors de la création.'
      setError(msgs)
    }
    setLoading(false)
  }

  return (
    <div className="h-full overflow-y-auto bg-white px-6 pb-32 pt-8">
      <div className="mx-auto max-w-93.75">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-[64px] font-black uppercase leading-none tracking-tight text-black">
            DROP A
            <br />
            PIN
          </h1>
          <p className="mt-3 text-sm font-bold text-[#666666]">Set up your next move.</p>
        </div>

        {/* Type toggle */}
        <div className="mb-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setEventType('planned')}
            className={`border-2 p-5 text-left transition-all ${
              eventType === 'planned'
                ? 'border-black bg-white shadow-[4px_4px_0_0_#000]'
                : 'border-black bg-white hover:bg-[#F5F5F5]'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xl font-black uppercase text-black">PLANNED</p>
              <span className="text-lg">📅</span>
            </div>
            <p className="mt-1.5 text-sm text-[#666666]">
              Schedule for later. Send invites and track RSVPs.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setEventType('spontaneous')}
            className={`border-2 p-5 text-left transition-all ${
              eventType === 'spontaneous'
                ? 'border-black bg-[#CCFF00] shadow-[4px_4px_0_0_#000]'
                : 'border-black bg-white hover:bg-[#F5F5F5]'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xl font-black uppercase text-black">RIGHT NOW</p>
              <span className="text-lg">⚡</span>
            </div>
            <p className={`mt-1.5 text-sm ${eventType === 'spontaneous' ? 'text-[#444444]' : 'text-[#666666]'}`}>
              Flash drop. Live for the next few hours.
            </p>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Mood */}
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-[#666666]">
              MOOD
            </label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`border-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                    mood === m.value
                      ? 'border-black bg-[#CCFF00] text-black'
                      : 'border-black bg-white text-black hover:bg-[#F5F5F5]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          {eventType === 'planned' && (
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
                EVENT TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's happening?"
                maxLength={100}
                className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none placeholder:text-[#AAAAAA] focus:border-[#CCFF00] transition-colors"
              />
            </div>
          )}

          {/* Date & time */}
          {eventType === 'planned' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
                  DATE
                </label>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none focus:border-[#CCFF00] transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
                  DÉBUT
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none focus:border-[#CCFF00] transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
                  FIN
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none focus:border-[#CCFF00] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Arrondissement */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
              ARRONDISSEMENT
            </label>
            <select
              value={arrondissement ?? ''}
              onChange={(e) => setArrondissement(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none focus:border-[#CCFF00] transition-colors appearance-none"
            >
              <option value="" disabled className="text-[#AAAAAA]">
                Sélectionne un arrondissement
              </option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((arr) => (
                <option key={arr} value={arr}>
                  Paris {ARRONDISSEMENT_LABELS[arr]}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          {eventType === 'planned' && (
            <>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
                  LIEU{' '}
                  <span className="font-normal normal-case tracking-normal text-[#AAAAAA]">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Nom du lieu"
                  maxLength={200}
                  className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none placeholder:text-[#AAAAAA] focus:border-[#CCFF00] transition-colors"
                />
              </div>

              <div className="flex h-36 items-center justify-center border-2 border-black bg-[#F5F5F5]">
                <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
                  LOCALISATION
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
                  LIEN{' '}
                  <span className="font-normal normal-case tracking-normal text-[#AAAAAA]">(optionnel)</span>
                </label>
                <input
                  type="url"
                  value={locationUrl}
                  onChange={(e) => setLocationUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none placeholder:text-[#AAAAAA] focus:border-[#CCFF00] transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
                  MAX PARTICIPANTS{' '}
                  <span className="font-normal normal-case tracking-normal text-[#AAAAAA]">(optionnel)</span>
                </label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  min={2}
                  max={100}
                  placeholder="Illimité"
                  className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none placeholder:text-[#AAAAAA] focus:border-[#CCFF00] transition-colors"
                />
              </div>
            </>
          )}

          {/* Target circles */}
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-[#666666]">
              ENVOYER À
            </label>
            {circles.length === 0 ? (
              <p className="text-xs text-[#AAAAAA]">Aucun cercle disponible.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {circles.map((circle) => {
                  const selected = targetCircles.includes(circle.id)
                  return (
                    <button
                      key={circle.id}
                      type="button"
                      onClick={() => toggleCircle(circle.id)}
                      className={`border-2 px-4 py-3 text-left text-sm font-black uppercase tracking-widest transition-colors ${
                        selected
                          ? 'border-black bg-[#CCFF00] text-black'
                          : 'border-black bg-white text-black hover:bg-[#F5F5F5]'
                      }`}
                    >
                      {circle.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs font-black uppercase tracking-wider text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 border-2 border-black bg-[#CCFF00] px-6 py-5 text-xl font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'CRÉATION...' : eventType === 'planned' ? 'LAUNCH →' : 'DROP IT ⚡'}
          </button>
        </form>
      </div>
    </div>
  )
}
