import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrvkmideqaeczhfxhobg.supabase.co';
const supabaseAnonKey = 'sb_publishable_g0mfcyMMdnEOeoN9_r7WNQ_dN7AhmqP';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Updating settings and match date in Supabase DB...');
  
  // 1. Update settings
  const { data: setRes, error: setErr } = await supabase
    .from('settings')
    .upsert({
      id: 1,
      whatsapp_url: 'https://chat.whatsapp.com/Ll7lo4R3C2d6PFGRIjLX4m',
      youtube_url: 'https://youtube.com/@faiz777gaming-n8i?si=N9m_EyhmE0DztDAL',
      updated_at: new Date().toISOString()
    })
    .select('*');

  if (setErr) {
    console.log('Settings update error:', setErr);
  } else {
    console.log('Settings updated successfully:', setRes);
  }

  // 2. Check matches table and insert/update match date to 06.09.2026
  const { data: matches, error: matchErr } = await supabase.from('matches').select('*');
  if (!matchErr && matches) {
    if (matches.length === 0) {
      const { data: newMatch, error: insErr } = await supabase.from('matches').insert({
        title: 'FAIZ 777 Official Room Match Trial',
        scheduled_at: '2026-09-06T18:00:00+05:30',
        status: 'open'
      }).select('*');
      console.log('Inserted default open match for 06.09.2026:', newMatch, insErr);
    } else {
      for (const m of matches) {
        await supabase.from('matches').update({
          scheduled_at: '2026-09-06T18:00:00+05:30'
        }).eq('id', m.id);
      }
      console.log('Updated existing matches to 06.09.2026');
    }
  }
}

run();
