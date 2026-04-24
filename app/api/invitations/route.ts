import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const createSchema = z.object({
  circle_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: inv, error } = await supabase
    .from('invitations')
    .select('id, created_by, circle_id, expires_at, uses_count')
    .eq('token', token)
    .single()

  if (error || !inv) {
    return NextResponse.json({ valid: false, debug: error?.message ?? 'not found' })
  }

  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, debug: 'expired' })
  }

  if ((inv.uses_count ?? 0) >= 10) {
    return NextResponse.json({ valid: false, debug: 'exhausted' })
  }

  // Fetch inviter name and circle name separately
  const [profileRes, circleRes] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name_init').eq('id', inv.created_by).single(),
    inv.circle_id
      ? supabase.from('circles').select('name').eq('id', inv.circle_id).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  return NextResponse.json({
    valid: true,
    inviter_name: profileRes.data
      ? `${profileRes.data.first_name} ${profileRes.data.last_name_init}`
      : '',
    circle_name: circleRes.data?.name ?? null,
    circle_id: inv.circle_id ?? null,
  })
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
  const token = randomBytes(24).toString('base64url')

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      created_by: user.id,
      token,
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
