import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createSchema = z.object({
  circle_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_invitation_info', {
    p_token: token,
  })

  if (error) {
    console.error('[invitations GET]', error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { circle_id } = parsed.data

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      created_by: user.id,
      ...(circle_id ? { circle_id } : {}),
    })
    .select('token, expires_at')
    .single()

  if (error) {
    console.error('[invitations POST]', error)
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  const url = `${request.nextUrl.origin}/join?token=${data.token}`

  return NextResponse.json({ token: data.token, url, expires_at: data.expires_at })
}
