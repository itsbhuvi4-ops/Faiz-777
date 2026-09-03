// One-time, idempotent setup. Invoke only with a valid admin setup secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (request) => {
  if (request.headers.get('x-setup-secret') !== Deno.env.get('INITIAL_ADMIN_SETUP_SECRET')) return new Response('Unauthorized', { status: 401 })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const email = 'bhuvi@gmail.com'
  const { data: listed } = await admin.auth.admin.listUsers()
  let user = listed.users.find((item) => item.email?.toLowerCase() === email)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: '1234', email_confirm: true })
    if (error || !data.user) return Response.json({ error: 'Unable to create initial admin.' }, { status: 500 })
    user = data.user
  }
  const { error } = await admin.from('admin_users').upsert({ user_id: user.id, username: 'BHUVI', display_name: 'Bhuvi', role: 'admin', active: true }, { onConflict: 'user_id' })
  if (error) return Response.json({ error: 'Unable to authorize initial admin.' }, { status: 500 })
  return Response.json({ ok: true, username: 'BHUVI' })
})
