'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { MoodType, CircleType } from '@/lib/supabase/types'

const MOOD_LABELS: Record<MoodType, string> = {
  cafe: 'CAFÉ', biere: 'BIÈRE', cine: 'CINÉ',
  restau: 'RESTAU', balade: 'BALADE', sport: 'SPORT',
}

interface Contact {
  id: string
  first_name: string
  last_name_init: string
  avatar_url: string | null
  is_online: boolean
  preferred_moods: MoodType[] | null
  current_mood: MoodType | null
  circles: Array<{ id: string; name: string; type: CircleType }>
}

interface Circle {
  id: string
  name: string
  type: CircleType
}

function ContactRow({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[#E5E5E5] px-4 py-3.5 last:border-b-0 hover:bg-[#F5F5F5] transition-colors text-left"
    >
      <div className="relative shrink-0">
        {contact.avatar_url ? (
          <img src={contact.avatar_url} alt={contact.first_name}
            className="h-10 w-10 rounded-full border-2 border-black object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#F5F5F5] text-sm font-black text-black">
            {contact.first_name.charAt(0)}
          </div>
        )}
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
          contact.is_online ? 'bg-[#CCFF00]' : 'bg-[#CCCCCC]'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-black uppercase text-black">
          {contact.first_name} {contact.last_name_init}
        </p>
        {!contact.current_mood && contact.preferred_moods && contact.preferred_moods.length > 0 && (
          <p className="truncate text-[10px] text-[#AAAAAA]">
            {contact.preferred_moods.slice(0, 3).map((m) => MOOD_LABELS[m]).join(' · ')}
          </p>
        )}
        {contact.current_mood && (
          <p className="text-[10px] font-black uppercase tracking-widest text-black">
            DISPO MAINTENANT
          </p>
        )}
      </div>

      {contact.current_mood && (
        <span className="shrink-0 border-2 border-black bg-[#CCFF00] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">
          {MOOD_LABELS[contact.current_mood]}
        </span>
      )}

      <span className="shrink-0 text-[#CCCCCC] text-lg">›</span>
    </button>
  )
}

function InviteModal({ circles, onClose }: { circles: Circle[]; onClose: () => void }) {
  const [step, setStep] = useState<'pick' | 'link'>('pick')
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateLink(circle: Circle) {
    setSelectedCircle(circle)
    setLoading(true)
    setStep('link')
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circle_id: circle.id }),
    })
    const data = await res.json()
    setUrl(data.url ?? '')
    setLoading(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: 'SeeYa', text: 'Rejoins-moi sur SeeYa !', url })
    } else {
      copyLink()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full border-t-2 border-black bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'pick' ? (
          <div className="p-6 pb-10">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#888888]">
              INVITER DANS
            </p>
            <h2 className="mb-6 text-2xl font-black uppercase text-black">QUEL CERCLE ?</h2>
            <div className="flex flex-col gap-2">
              {circles.map((circle) => (
                <button
                  key={circle.id}
                  onClick={() => generateLink(circle)}
                  className="border-2 border-black px-4 py-4 text-left text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-[#CCFF00] hover:shadow-[4px_4px_0_0_#000]"
                >
                  {circle.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 pb-10">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#888888]">
              INVITATION · {selectedCircle?.name}
            </p>
            <h2 className="mb-4 text-2xl font-black uppercase text-black">PARTAGE LE LIEN</h2>

            {loading ? (
              <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
                GÉNÉRATION...
              </p>
            ) : (
              <>
                <p className="mb-4 break-all border-2 border-black bg-[#F5F5F5] px-3 py-2 text-[11px] font-bold text-black">
                  {url}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={shareLink}
                    className="flex-1 border-2 border-black bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none"
                  >
                    PARTAGER →
                  </button>
                  <button
                    onClick={copyLink}
                    className="border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-[#F5F5F5] transition-colors"
                  >
                    {copied ? '✓' : 'COPIER'}
                  </button>
                </div>
                <button
                  onClick={() => { setStep('pick'); setUrl('') }}
                  className="mt-3 w-full text-center text-[10px] font-black uppercase tracking-widest text-[#888888] hover:text-black"
                >
                  ← CHANGER DE CERCLE
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type TabFilter = 'all' | 'proches' | 'collegues' | 'connaissances'

export default function CirclesPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('all')
  const [showInvite, setShowInvite] = useState(false)

  const load = useCallback(async () => {
    const [contactsRes, circlesRes] = await Promise.all([
      fetch('/api/contacts'),
      fetch('/api/circles'),
    ])
    if (contactsRes.ok) setContacts(await contactsRes.json())
    if (circlesRes.ok) {
      const data = await circlesRes.json()
      setCircles(data.map((c: Record<string, unknown>) => ({
        id: c.id, name: c.name, type: c.type,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'TOUS' },
    { key: 'proches', label: 'PROCHES' },
    { key: 'collegues', label: 'COLLÈGUES' },
    { key: 'connaissances', label: 'CONNAISSANCES' },
  ]

  const filtered =
    tab === 'all'
      ? contacts
      : contacts.filter((c) => c.circles.some((circle) => circle.type === tab))

  function countByType(type: Exclude<TabFilter, 'all'>): number {
    return contacts.filter((c) => c.circles.some((circle) => circle.type === type)).length
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 border-b-2 border-black bg-white px-4 pt-6 pb-0">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[40px] font-black uppercase leading-none tracking-tight text-black">
            CERCLES
          </h1>
          <button
            onClick={() => setShowInvite(true)}
            className="border-2 border-black bg-[#CCFF00] px-3 py-2 text-xs font-black uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] transition-all hover:shadow-none"
          >
            + INVITER
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                tab === key ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F5F5F5]'
              }`}
            >
              {label}
              <span className="ml-1 opacity-50">
                ({key === 'all' ? contacts.length : countByType(key as Exclude<TabFilter, 'all'>)})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto pb-28">
        {loading ? (
          <p className="pt-12 text-center text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
            CHARGEMENT...
          </p>
        ) : filtered.length === 0 ? (
          <div className="pt-16 text-center">
            <p className="text-4xl font-black text-[#E5E5E5]">0</p>
            <p className="mt-3 text-xs font-black uppercase tracking-widest text-[#AAAAAA]">
              {tab === 'all'
                ? "Aucun contact. Invite quelqu'un !"
                : 'Aucun contact dans ce cercle.'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                onClick={() => router.push(`/circles/friend/${contact.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal circles={circles} onClose={() => setShowInvite(false)} />
      )}
    </div>
  )
}
