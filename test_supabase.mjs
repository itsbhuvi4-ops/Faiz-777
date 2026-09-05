import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrvkmideqaeczhfxhobg.supabase.co';
const supabaseAnonKey = 'sb_publishable_g0mfcyMMdnEOeoN9_r7WNQ_dN7AhmqP';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('--- Testing Supabase Connection ---');
  
  const tables = [
    'applications',
    'members',
    'settings',
    'matches',
    'match_registrations',
    'match_results',
    'admin_users',
    'admin_config'
  ];

  for (const t of tables) {
    const res = await supabase.from(t).select('*').limit(1);
    if (res.error) {
      console.log(`Table [${t}]: ERROR -> code: ${res.error.code}, message: ${res.error.message}`);
    } else {
      console.log(`Table [${t}]: OK -> count/rows: ${res.data?.length}`);
    }
  }

  const rpcs = [
    { name: 'submit_application', args: { payload: {} } },
    { name: 'get_application_status', args: { p_application_id: 'TEST' } },
    { name: 'admin_get_applications', args: { admin_passcode: '1234' } },
    { name: 'admin_select_application', args: { target_id: '00000000-0000-0000-0000-000000000000', admin_passcode: '1234' } },
    { name: 'admin_reject_application', args: { target_id: '00000000-0000-0000-0000-000000000000', admin_passcode: '1234' } },
    { name: 'admin_delete_application', args: { target_id: '00000000-0000-0000-0000-000000000000', admin_passcode: '1234' } }
  ];

  for (const r of rpcs) {
    const res = await supabase.rpc(r.name, r.args);
    if (res.error) {
      console.log(`RPC [${r.name}]: code: ${res.error.code}, message: ${res.error.message}`);
    } else {
      console.log(`RPC [${r.name}]: OK -> result:`, res.data);
    }
  }
}

test();
