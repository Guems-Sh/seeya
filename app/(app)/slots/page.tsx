'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSlots, type Slot } from '@/hooks/useSlots'
import type { MoodType } from '@/lib/supabase/types'

const MOODS: { value: MoodType; label: string }[] = [
  { value: 'cafe', label: 'CAFÉ' },
  { value: 'biere', label: 'BIÈRE' },
  { value: 'cine', label: 'CINÉ' },
  { value: 'restau', label: 'RESTAU' },
  { value: 'balade', label: 'BALADE' },
  { value: 'sport', label: 'SPORT' },
]

const DAY_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim',
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).toUpperCase()
}

function SlotCard({ slot, onDelete }: { slot: Slot; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/slots/${slot.id}`, { method: 'DELETE' })
    onDelete(slot.id)
  }

  return (
    <div className="flex items-start justify-between border-2 border-[#333333] bg-[#1A1A1A] p-4">
      <div className="flex flex-col gap-2">
        <p className="text-lg font-black uppercase tracking-wide text-white">
          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
        </p>
        {slot.is_recurring && slot.recurrence_days && slot.recurrence_days.length > 0 && (
          <p className="text-xs font-bold uppercase tracking-widest text-[#CCFF00]">
            {slot.recurrence_days.map((d) => DAY_LABELS[d]).join(' · ')}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {slot.moods.map((mood) => (
            <span
              key={mood}
              className="border border-[#CCFF00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#CCFF00]"
            >
              {MOODS.find((m) => m.value === mood)?.label ?? mood}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="ml-4 shrink-0 border-2 border-[#333333] p-2 text-[#999999] transition-colors hover:border-red-500 hover:text-red-500 disabled:opacity-40"
        aria-label="Supprimer"
      >
        ✕
      </button>
    </div>
  )
}

function AddSlotForm({ onCreated }: { onCreated: () => void }) {
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('19:00')
  const [endTime, setEndTime] = useState('22:00')
  const [moods, setMoods] = useState<MoodType[]>([])
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleMood(mood: MoodType) {
    setMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    )
  }

  function toggleDay(day: number) {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (moods.length === 0) {
      setError('Sélectionne au moins un mood.')
      return
    }
    if (isRecurring && recurrenceDays.length === 0) {
      setError('Sélectionne au moins un jour de récurrence.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        start_time: startTime,
        end_time: endTime,
        moods,
        is_recurring: isRecurring,
        recurrence_days: isRecurring ? recurrenceDays : undefined,
      }),
    })

    if (res.ok) {
      onCreated()
    } else {
      const data = await res.json()
      setError(data.error?.formErrors?.[0] ?? 'Erreur lors de la création.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 border-2 border-[#CCFF00] p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[#CCFF00]">
        NOUVEAU CRÉNEAU
      </p>

      {/* Recurring toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsRecurring((v) => !v)}
          className={`h-6 w-11 rounded-full border-2 transition-colors ${
            isRecurring ? 'border-[#CCFF00] bg-[#CCFF00]' : 'border-[#333333] bg-transparent'
          }`}
          role="switch"
          aria-checked={isRecurring}
        >
          <span
            className={`block h-3 w-3 rounded-full bg-black transition-transform ${
              isRecurring ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-white">
          RÉCURRENT
        </span>
      </div>

      {/* Date (only if not recurring) */}
      {!isRecurring && (
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#999999]">
            DATE
          </label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required={!isRecurring}
            className="w-full border-2 border-[#333333] bg-[#1A1A1A] px-4 py-3 font-bold text-white outline-none focus:border-[#CCFF00] transition-colors"
          />
        </div>
      )}

      {/* Recurrence days */}
      {isRecurring && (
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#999999]">
            JOURS
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const selected = recurrenceDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex h-10 w-10 items-center justify-center border-2 text-xs font-bold transition-colors ${
                    selected
                      ? 'border-[#CCFF00] bg-[#CCFF00] text-black'
                      : 'border-[#333333] text-white hover:border-[#CCFF00]'
                  }`}
                >
                  {DAY_LABELS[day][0]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Time range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#999999]">
            DÉBUT
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full border-2 border-[#333333] bg-[#1A1A1A] px-4 py-3 font-bold text-white outline-none focus:border-[#CCFF00] transition-colors"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#999999]">
            FIN
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full border-2 border-[#333333] bg-[#1A1A1A] px-4 py-3 font-bold text-white outline-none focus:border-[#CCFF00] transition-colors"
          />
        </div>
      </div>

      {/* Moods */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#999999]">
          MOODS
        </label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((mood) => {
            const selected = moods.includes(mood.value)
            return (
              <button
                key={mood.value}
                type="button"
                onClick={() => toggleMood(mood.value)}
                className={`border-2 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  selected
                    ? 'border-[#CCFF00] bg-[#CCFF00] text-black'
                    : 'border-[#333333] text-white hover:border-[#CCFF00]'
                }`}
              >
                {mood.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <p className="text-xs font-bold uppercase tracking-wider text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="border-2 border-[#CCFF00] bg-[#CCFF00] px-4 py-4 font-black uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-[#CCFF00] disabled:opacity-40"
      >
        {loading ? 'CRÉATION...' : 'AJOUTER →'}
      </button>
    </form>
  )
}

export default function SlotsPage() {
  const { slots, loading, refetch } = useSlots()
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  function handleDelete(id: string) {
    refetch()
  }

  function handleCreated() {
    setShowForm(false)
    refetch()
  }

  const recurring = slots.filter((s) => s.is_recurring)
  const oneOff = slots.filter((s) => !s.is_recurring)

  const grouped = oneOff.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = slot.date
    return { ...acc, [key]: [...(acc[key] ?? []), slot] }
  }, {})

  return (
    <div className="h-full overflow-y-auto bg-black px-4 pb-32 pt-8">
      <div className="mx-auto max-w-[375px]">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-xs font-bold uppercase tracking-widest text-[#999999] hover:text-white"
          >
            ← RETOUR
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            CRÉNEAUX
          </h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`border-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
              showForm
                ? 'border-[#333333] bg-transparent text-[#999999]'
                : 'border-[#CCFF00] bg-[#CCFF00] text-black'
            }`}
          >
            {showForm ? 'ANNULER' : '+ AJOUTER'}
          </button>
        </div>

        {showForm && (
          <div className="mb-8">
            <AddSlotForm onCreated={handleCreated} />
          </div>
        )}

        {loading && (
          <p className="text-xs font-bold uppercase tracking-widest text-[#999999]">
            CHARGEMENT...
          </p>
        )}

        {!loading && slots.length === 0 && !showForm && (
          <div className="mt-16 text-center">
            <p className="text-4xl font-black uppercase text-[#333333]">VIDE.</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[#555555]">
              Ajoute tes créneaux libres pour trouver des plans.
            </p>
          </div>
        )}

        {/* Recurring slots */}
        {recurring.length > 0 && (
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#999999]">
              RÉCURRENTS
            </p>
            <div className="flex flex-col gap-3">
              {recurring.map((slot) => (
                <SlotCard key={slot.id} slot={slot} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {/* One-off slots grouped by date */}
        {Object.keys(grouped)
          .sort()
          .map((date) => (
            <div key={date} className="mb-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#999999]">
                {formatDate(date)}
              </p>
              <div className="flex flex-col gap-3">
                {grouped[date].map((slot) => (
                  <SlotCard key={slot.id} slot={slot} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
