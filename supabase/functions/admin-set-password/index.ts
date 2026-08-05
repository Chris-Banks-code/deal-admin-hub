import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const caller = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: userErr } = await caller.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(url, service)

    // Only admins / super admins may reset another user's password
    const { data: profile } = await admin
      .from('profiles').select('role').eq('id', user.id).single()
    const { data: roles } = await admin
      .from('user_roles').select('role').eq('user_id', user.id)
    const roleList = [profile?.role, ...(roles ?? []).map((r: { role: string }) => r.role)]
    const allowed = ['admin', 'super_admin', 'operation_manager']
    if (!roleList.some((r) => r && allowed.includes(r))) {
      return json({ error: 'Forbidden: admin access required' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const userId: unknown = body?.user_id
    const password: unknown = body?.password
    if (typeof userId !== 'string' || !userId) return json({ error: 'user_id is required' }, 400)
    if (typeof password !== 'string' || password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400)
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    })
    if (error) return json({ error: error.message }, 400)

    return json({ success: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500)
  }
})
