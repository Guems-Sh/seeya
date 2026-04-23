'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Circle = Database['public']['Tables']['circles']['Row']

export function useCircles() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCircles = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('circles')
      .select('*')
      .order('created_at')

    if (!error && data) setCircles(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCircles()
  }, [fetchCircles])

  return { circles, loading, refetch: fetchCircles }
}
