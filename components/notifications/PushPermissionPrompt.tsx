'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export default function PushPermissionPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem('push_dismissed')) return
    // Delay prompt — let user settle into the app first
    const t = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(t)
  }, [])

  async function subscribe() {
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setShow(false); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ) as unknown as ArrayBuffer,
      })

      const json = sub.toJSON()
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      })

      setShow(false)
    } catch (err) {
      console.error('[push subscribe]', err)
    }
    setLoading(false)
  }

  function dismiss() {
    localStorage.setItem('push_dismissed', '1')
    setDismissed(true)
    setShow(false)
  }

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] md:bottom-6 md:left-auto md:right-6 md:max-w-xs">
      <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#888888]">
        NOTIFICATIONS
      </p>
      <p className="mb-4 text-sm text-[#666666]">
        Reçois une notif quand un ami lance un plan ou qu'un créneau matche.
      </p>
      <div className="flex gap-2">
        <button
          onClick={subscribe}
          disabled={loading}
          className="flex-1 border-2 border-black bg-[#CCFF00] py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000] transition-all hover:shadow-none disabled:opacity-40"
        >
          {loading ? '...' : 'ACTIVER →'}
        </button>
        <button
          onClick={dismiss}
          className="border-2 border-black px-3 py-2.5 text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-[#F5F5F5]"
        >
          PLUS TARD
        </button>
      </div>
    </div>
  )
}
