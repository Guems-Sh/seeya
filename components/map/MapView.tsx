'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MoodType } from '@/lib/supabase/types'
import { useProfile } from '@/hooks/useProfile'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

const ARRONDISSEMENT_CENTROIDS: Record<number, [number, number]> = {
  1: [2.3471, 48.8603], 2: [2.3471, 48.8656], 3: [2.3553, 48.8626],
  4: [2.3525, 48.8540], 5: [2.3481, 48.8462], 6: [2.3337, 48.8494],
  7: [2.3130, 48.8566], 8: [2.3099, 48.8736], 9: [2.3419, 48.8764],
  10: [2.3607, 48.8757], 11: [2.3792, 48.8589], 12: [2.4023, 48.8440],
  13: [2.3617, 48.8308], 14: [2.3273, 48.8291], 15: [2.2981, 48.8413],
  16: [2.2739, 48.8632], 17: [2.3094, 48.8852], 18: [2.3456, 48.8909],
  19: [2.3826, 48.8815], 20: [2.3992, 48.8639],
}

interface EventPin {
  id: string
  title: string | null
  mood: MoodType
  type: 'planned' | 'spontaneous'
  arrondissement: number | null
  location_name: string | null
  date: string | null
  start_time: string | null
  coordinates: [number, number]
}

type TimeFilter = 'all' | 'matin' | 'aprem' | 'soir'

function parsePoint(pg: string | null): [number, number] | null {
  if (!pg) return null
  const m = pg.match(/\(([^,]+),([^)]+)\)/)
  if (!m) return null
  return [parseFloat(m[1]), parseFloat(m[2])]
}

function fuzzyOffset(): [number, number] {
  const r = 300 + Math.random() * 500
  const angle = Math.random() * 2 * Math.PI
  const dLat = (r * Math.cos(angle)) / 111320
  const dLng = (r * Math.sin(angle)) / (111320 * Math.cos((48.8566 * Math.PI) / 180))
  return [dLat, dLng]
}

function inTimeWindow(startTime: string | null, filter: TimeFilter): boolean {
  if (filter === 'all' || !startTime) return true
  const h = parseInt(startTime.slice(0, 2))
  if (filter === 'matin') return h >= 6 && h < 12
  if (filter === 'aprem') return h >= 12 && h < 18
  return h >= 18 || h < 6
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const fuzzyOffsetRef = useRef<[number, number] | null>(null)
  const offsetTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { profile } = useProfile()
  const [events, setEvents] = useState<EventPin[]>([])
  const [moodFilter, setMoodFilter] = useState<MoodType | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [selected, setSelected] = useState<EventPin | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Fetch events
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/events')
      if (!res.ok) return
      const data = await res.json()
      const pins: EventPin[] = data.map((e: Record<string, unknown>) => {
        const fuzzy = parsePoint(e.location_fuzzy as string | null)
        const fallback = e.arrondissement
          ? ARRONDISSEMENT_CENTROIDS[e.arrondissement as number] ?? [2.3522, 48.8566]
          : [2.3522, 48.8566] as [number, number]
        return {
          id: e.id as string,
          title: e.title as string | null,
          mood: e.mood as MoodType,
          type: e.type as 'planned' | 'spontaneous',
          arrondissement: e.arrondissement as number | null,
          location_name: e.location_name as string | null,
          date: e.date as string | null,
          start_time: e.start_time as string | null,
          coordinates: fuzzy ?? fallback,
        }
      })
      setEvents(pins)
    }
    load()
  }, [])

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [2.3522, 48.8566],
      zoom: 12.5,
      attributionControl: false,
    })
    map.on('load', () => setMapReady(true))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // User fuzzy location — only when online + location sharing enabled
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    if (!profile) return

    userMarkerRef.current?.remove()
    userMarkerRef.current = null
    if (offsetTimerRef.current) clearInterval(offsetTimerRef.current)

    if (!profile.is_online || !profile.location_sharing) return

    function refreshOffset() {
      fuzzyOffsetRef.current = fuzzyOffset()
    }
    refreshOffset()
    offsetTimerRef.current = setInterval(refreshOffset, 30 * 60 * 1000)

    navigator.geolocation?.getCurrentPosition((pos) => {
      const [dLat, dLng] = fuzzyOffsetRef.current ?? [0, 0]
      const lat = pos.coords.latitude + dLat
      const lng = pos.coords.longitude + dLng

      const el = document.createElement('div')
      el.innerHTML = `
        <div style="width:16px;height:16px;border-radius:50%;background:#CCFF00;border:2px solid #000;box-shadow:0 0 0 4px rgba(204,255,0,0.25)"></div>
      `

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapRef.current!)
    })

    return () => {
      if (offsetTimerRef.current) clearInterval(offsetTimerRef.current)
      userMarkerRef.current?.remove()
    }
  }, [mapReady, profile?.is_online, profile?.location_sharing])

  // Render event pins
  const renderPins = useCallback(() => {
    if (!mapRef.current || !mapReady) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const filtered = events.filter((e) => {
      if (moodFilter && e.mood !== moodFilter) return false
      if (!inTimeWindow(e.start_time, timeFilter)) return false
      return true
    })

    filtered.forEach((event) => {
      const el = document.createElement('div')
      el.style.cssText = `
        width:24px;height:24px;background:#000;border:2px solid #CCFF00;
        display:flex;align-items:center;justify-content:center;cursor:pointer;
        transition:transform 0.1s;
      `
      const dot = document.createElement('div')
      dot.style.cssText = 'width:8px;height:8px;background:#CCFF00;'
      el.appendChild(dot)

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
      el.addEventListener('click', () => setSelected(event))

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(event.coordinates)
        .addTo(mapRef.current!)
      markersRef.current.push(marker)
    })
  }, [events, moodFilter, timeFilter, mapReady])

  useEffect(() => { renderPins() }, [renderPins])

  const moods = Object.keys(MOOD_LABELS) as MoodType[]

  const isOffline = profile && !profile.is_online

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Offline banner */}
      {isOffline && (
        <div className="absolute left-4 right-4 top-4 z-20 pointer-events-none">
          <div className="flex items-center justify-between border-2 border-black bg-white/95 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#888888]">
              HORS-LIGNE — invisible dans les matchings
            </p>
            <Link
              href="/profile"
              className="pointer-events-auto text-[10px] font-black uppercase tracking-widest text-[#CCFF00]"
            >
              ACTIVER →
            </Link>
          </div>
        </div>
      )}

      {/* Filters overlay */}
      <div className={`absolute left-4 right-4 flex flex-col gap-2 pointer-events-none ${isOffline ? 'top-14' : 'top-4'}`}>
        {/* Time filters */}
        <div className="flex gap-2 pointer-events-auto">
          {(['all', 'matin', 'aprem', 'soir'] as TimeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                timeFilter === t
                  ? 'border-black bg-[#CCFF00] text-black'
                  : 'border-black bg-white/90 text-black hover:bg-[#F5F5F5]'
              }`}
            >
              {t === 'all' ? 'TOUS' : t === 'matin' ? 'MATIN' : t === 'aprem' ? 'APRÈS-MIDI' : 'SOIR'}
            </button>
          ))}
        </div>

        {/* Mood filters */}
        <div className="flex flex-wrap gap-1.5 pointer-events-auto">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setMoodFilter(moodFilter === m ? null : m)}
              className={`border-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                moodFilter === m
                  ? 'border-black bg-[#CCFF00] text-black'
                  : 'border-black bg-white/90 text-black hover:bg-[#F5F5F5]'
              }`}
            >
              {MOOD_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Event preview card */}
      {selected && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="border-2 border-black bg-white shadow-[4px_4px_0_0_#000] p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex gap-2">
                <span className="border-2 border-black bg-[#CCFF00] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                  {MOOD_LABELS[selected.mood]}
                </span>
                <span className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                  {selected.type === 'planned' ? 'PLANIFIÉ' : 'MAINTENANT'}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-[#888888] hover:text-black"
              >
                ✕
              </button>
            </div>

            <h3 className="mb-1 text-lg font-black uppercase leading-tight text-black">
              {selected.title ?? MOOD_LABELS[selected.mood]}
            </h3>

            {selected.date && (
              <p className="mb-1 text-xs font-bold text-[#666666]">
                {new Date(selected.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'short', day: 'numeric', month: 'short',
                }).toUpperCase()}
                {selected.start_time && (
                  <span className="text-black"> · {selected.start_time.slice(0, 5)}</span>
                )}
              </p>
            )}

            {selected.location_name && (
              <p className="mb-3 text-xs text-[#888888]">
                📍 {selected.location_name}
              </p>
            )}

            <Link
              href={`/events/${selected.id}`}
              className="block w-full border-2 border-black bg-[#CCFF00] py-3 text-center text-sm font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none"
            >
              JOIN DROP →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
