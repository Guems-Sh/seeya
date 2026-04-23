'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Slot = Database['public']['Tables']['slots']['Row']

export function useSlots() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSlots = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .or(`date.gte.${today},is_recurring.eq.true`)
      .order('is_recurring', { ascending: false })
      .order('date')
      .order('start_time')

    if (!error && data) setSlots(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  return { slots, loading, refetch: fetchSlots }
}
