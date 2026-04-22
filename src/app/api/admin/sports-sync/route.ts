import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAnon } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Verify admin auth
  const supabase = await createAnon()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role?.toLowerCase() !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { mode } = await req.json().catch(() => ({ mode: 'open' }))

  // Proxy to sports sync with internal secret
  const internalReq = new NextRequest(new URL('/api/sports/sync', req.url), {
    method:  'POST',
    headers: { 'content-type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET ?? '' },
    body:    JSON.stringify({ mode }),
  })

  const { POST: syncPost } = await import('@/app/api/sports/sync/route')
  return syncPost(internalReq)
}
