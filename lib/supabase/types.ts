export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type MoodType = 'cafe' | 'biere' | 'cine' | 'restau' | 'balade' | 'sport'
export type CircleType = 'proches' | 'collegues' | 'connaissances' | 'custom'
export type EventType = 'planned' | 'spontaneous'
export type EventStatus = 'open' | 'confirmed' | 'cancelled'
export type ParticipantStatus = 'invited' | 'confirmed' | 'declined'
export type AvailabilityType = 'weekday_evenings' | 'weekends' | 'both'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name_init: string
          avatar_url: string | null
          bio: string | null
          preferred_arrondissements: number[] | null
          preferred_moods: MoodType[] | null
          usual_availability: AvailabilityType | null
          is_online: boolean
          location_sharing: boolean
          created_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name_init: string
          avatar_url?: string | null
          bio?: string | null
          preferred_arrondissements?: number[] | null
          preferred_moods?: MoodType[] | null
          usual_availability?: AvailabilityType | null
          is_online?: boolean
          location_sharing?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name_init?: string
          avatar_url?: string | null
          bio?: string | null
          preferred_arrondissements?: number[] | null
          preferred_moods?: MoodType[] | null
          usual_availability?: AvailabilityType | null
          is_online?: boolean
          location_sharing?: boolean
          created_at?: string
        }
        Relationships: []
      }
      circles: {
        Row: {
          id: string
          owner_id: string
          name: string
          type: CircleType
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          type: CircleType
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          type?: CircleType
          created_at?: string
        }
        Relationships: []
      }
      circle_members: {
        Row: {
          circle_id: string
          profile_id: string
        }
        Insert: {
          circle_id: string
          profile_id: string
        }
        Update: {
          circle_id?: string
          profile_id?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          id: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          moods: MoodType[]
          is_recurring: boolean
          recurrence_days: number[] | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          moods: MoodType[]
          is_recurring?: boolean
          recurrence_days?: number[] | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          start_time?: string
          end_time?: string
          moods?: MoodType[]
          is_recurring?: boolean
          recurrence_days?: number[] | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          creator_id: string
          title: string | null
          mood: MoodType
          type: EventType
          status: EventStatus
          date: string | null
          start_time: string | null
          end_time: string | null
          arrondissement: number | null
          location_name: string | null
          location_url: string | null
          location_coords: string | null
          location_fuzzy: string | null
          max_participants: number | null
          target_circles: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title?: string | null
          mood: MoodType
          type: EventType
          status?: EventStatus
          date?: string | null
          start_time?: string | null
          end_time?: string | null
          arrondissement?: number | null
          location_name?: string | null
          location_url?: string | null
          location_coords?: string | null
          location_fuzzy?: string | null
          max_participants?: number | null
          target_circles?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string | null
          mood?: MoodType
          type?: EventType
          status?: EventStatus
          date?: string | null
          start_time?: string | null
          end_time?: string | null
          arrondissement?: number | null
          location_name?: string | null
          location_url?: string | null
          location_coords?: string | null
          location_fuzzy?: string | null
          max_participants?: number | null
          target_circles?: string[] | null
          created_at?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          event_id: string
          profile_id: string
          status: ParticipantStatus
          joined_at: string
        }
        Insert: {
          event_id: string
          profile_id: string
          status?: ParticipantStatus
          joined_at?: string
        }
        Update: {
          event_id?: string
          profile_id?: string
          status?: ParticipantStatus
          joined_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          user_a: string
          user_b: string
          slot_a: string
          slot_b: string
          overlap_start: string
          overlap_end: string
          shared_moods: MoodType[]
          notified: boolean
          response_a: 'accepted' | 'ignored' | null
          response_b: 'accepted' | 'ignored' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_a: string
          user_b: string
          slot_a: string
          slot_b: string
          overlap_start: string
          overlap_end: string
          shared_moods: MoodType[]
          notified?: boolean
          response_a?: 'accepted' | 'ignored' | null
          response_b?: 'accepted' | 'ignored' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_a?: string
          user_b?: string
          slot_a?: string
          slot_b?: string
          overlap_start?: string
          overlap_end?: string
          shared_moods?: MoodType[]
          notified?: boolean
          response_a?: 'accepted' | 'ignored' | null
          response_b?: 'accepted' | 'ignored' | null
          created_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          created_by: string
          token: string
          circle_id: string | null
          uses_count: number
          expires_at: string | null
          used_at: string | null
        }
        Insert: {
          id?: string
          created_by: string
          token?: string
          circle_id?: string | null
          uses_count?: number
          expires_at?: string | null
          used_at?: string | null
        }
        Update: {
          id?: string
          created_by?: string
          token?: string
          circle_id?: string | null
          uses_count?: number
          expires_at?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth_key?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      get_invitation_info: {
        Args: { p_token: string }
        Returns: {
          valid: boolean
          inviter_name?: string
          circle_name?: string
          circle_id?: string
        }
      }
      join_via_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: {
          success?: boolean
          error?: string
          circle_id?: string
        }
      }
    }
    Enums: {
      mood_type: MoodType
      circle_type: CircleType
      event_type: EventType
      event_status: EventStatus
      participant_status: ParticipantStatus
      availability_type: AvailabilityType
    }
    CompositeTypes: Record<never, never>
  }
}
