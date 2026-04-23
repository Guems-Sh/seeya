'use client'

import { useState, useEffect } from 'react'
import type { MoodType, AvailabilityType } from '@/lib/supabase/types'

export interface ProfileData {
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

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setProfile(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { profile, loading }
}
