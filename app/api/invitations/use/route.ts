import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token } = body
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  type JoinResult = {
    success?: boolean
    error?: string
    circle_id?: string
    inviter_id?: string
    circle_name?: string
  }

  const { data: rawResult, error } = await supabase.rpc('join_via_invitation', {
    p_token: token,
    p_user_id: user.id,
  })
  const result = rawResult as JoinResult | null

  if (error) {
    console.error('[invitations/use]', error)
    return NextResponse.json({ error: 'Failed to process invitation' }, { status: 500 })
  }

  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  if (!result) {
    return NextResponse.json({ error: 'No result' }, { status: 500 })
  }

  // Send push notification to inviter (non-blocking)
  if (result?.success && result?.inviter_id) {
    try {
      const { data: joiner } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()

      const firstName = joiner?.first_name ?? 'Quelqu\'un'
      const circleName = result.circle_name ?? 'ton cercle'

      await sendPushToUser(result.inviter_id as string, {
        title: `${firstName} a rejoint SeeYa !`,
        body: `Il·Elle est maintenant dans ${circleName}.`,
        url: '/circles',
      })
    } catch (e) {
      console.error('[push after join]', e)
    }
  }

  return NextResponse.json({ success: true, circle_id: result?.circle_id })
}
