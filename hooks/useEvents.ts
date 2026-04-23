'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database, MoodType } from '@/lib/supabase/types'

export type EventRow = Database['public']['Tables']['events']['Row']

interface EventFilters {
  mood?: MoodType
  arrondissement?: number
  status?: 'open' | 'confirmed' | 'cancelled'
}

export function useEvents(filters?: EventFilters) {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from('events')
      .select('*')
      .eq('status', filters?.status ?? 'open')
      .order('created_at', { ascending: false })

    if (filters?.mood) query = query.eq('mood', filters.mood)
    if (filters?.arrondissement) query = query.eq('arrondissement', filters.arrondissement)

    const { data, error } = await query
    if (!error && data) setEvents(data)
    setLoading(false)
  }, [filters?.mood, filters?.arrondissement, filters?.status])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, refetch: fetchEvents }
}

export function useMyEvents() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) setEvents(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, refetch: fetchEvents }
}
