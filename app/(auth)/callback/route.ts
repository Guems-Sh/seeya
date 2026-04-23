import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  if (sessionError) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .single()

  const hasProfile = !!profile?.first_name

  if (!hasProfile) {
    // New user: pass token to onboarding so it can be processed after profile creation
    const dest = token
      ? `${origin}/onboarding?token=${encodeURIComponent(token)}`
      : `${origin}/onboarding`
    return NextResponse.redirect(dest)
  }

  // Existing user: process invitation token immediately
  if (token) {
    await supabase.rpc('join_via_invitation', {
      p_token: token,
      p_user_id: user.id,
    })
  }

  return NextResponse.redirect(`${origin}${next}`)
}
