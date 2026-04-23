'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="w-full max-w-93.75">
        <h1 className="mb-4 text-6xl font-black uppercase leading-none tracking-tight text-black">
          CHECK
          <br />
          YOUR
          <br />
          MAIL.
        </h1>
        <p className="text-[#666666]">
          Magic link sent to{' '}
          <span className="font-bold text-black">{email}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-93.75">
      <div className="mb-12">
        <h1 className="text-6xl font-black uppercase leading-none tracking-tight text-black">
          SEE
          <br />
          YA.
        </h1>
        <p className="mt-4 text-sm font-bold uppercase tracking-wider text-[#666666]">
          Make plans happen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[#666666]">
            Email
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
          <p className="text-xs font-bold uppercase tracking-wider text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="mt-2 border-2 border-black bg-[#CCFF00] px-6 py-5 text-base font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'ENVOI...' : 'ENVOYER LE LIEN →'}
        </button>
      </form>
    </div>
  )
}
