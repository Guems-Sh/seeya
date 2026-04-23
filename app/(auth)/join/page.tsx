'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface InvitationInfo {
  valid: boolean
  inviter_name?: string
  circle_name?: string
  circle_id?: string
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-93.75">
        <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">CHARGEMENT...</p>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}

function JoinContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [info, setInfo] = useState<InvitationInfo | null>(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/invitations?token=${token}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ valid: false }))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?token=${token}`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="w-full max-w-93.75">
        <p className="text-sm font-black uppercase tracking-widest text-[#888888]">Lien invalide.</p>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="w-full max-w-93.75">
        <p className="text-xs font-black uppercase tracking-widest text-[#AAAAAA]">VÉRIFICATION...</p>
      </div>
    )
  }

  if (!info.valid) {
    return (
      <div className="w-full max-w-93.75">
        <h1 className="mb-4 text-5xl font-black uppercase leading-none text-black">
          LIEN<br />EXPIRÉ.
        </h1>
        <p className="text-sm text-[#666666]">Demande un nouveau lien à ton ami.</p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="w-full max-w-93.75">
        <h1 className="mb-4 text-5xl font-black uppercase leading-none text-black">
          CHECK<br />TON MAIL.
        </h1>
        <p className="text-[#666666]">
          Magic link envoyé à{' '}
          <span className="font-bold text-black">{email}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-93.75">
      <div className="mb-10">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#888888]">
          INVITATION
        </p>
        <h1 className="text-5xl font-black uppercase leading-none text-black">
          {info.inviter_name}<br />T'INVITE.
        </h1>
        {info.circle_name && (
          <p className="mt-4 text-sm text-[#666666]">
            Tu rejoindras{' '}
            <span className="font-bold text-black">{info.circle_name}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
            Ton email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            required
            className="w-full border-2 border-black bg-white px-4 py-4 font-bold text-black outline-none placeholder:text-[#AAAAAA] focus:border-[#CCFF00] transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs font-black uppercase tracking-wider text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="mt-2 border-2 border-black bg-[#CCFF00] px-6 py-5 text-base font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'ENVOI...' : 'REJOINDRE →'}
        </button>
      </form>
    </div>
  )
}
