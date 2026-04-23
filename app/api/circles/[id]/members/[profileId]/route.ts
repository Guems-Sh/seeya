import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  const { id, profileId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only circle owner can remove members (RLS also enforces this)
  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', id)
    .eq('profile_id', profileId)

  if (error) {
    console.error('[circle members DELETE]', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  const { id, profileId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: circle } = await supabase
    .from('circles')
    .select('owner_id')
    .eq('id', id)
    .single()

  if (circle?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('circle_members')
    .upsert({ circle_id: id, profile_id: profileId }, { onConflict: 'circle_id,profile_id', ignoreDuplicates: true })

  if (error) {
    console.error('[circle members POST]', error)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
