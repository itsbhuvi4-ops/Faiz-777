import { createClient } from '@supabase/supabase-js'

const defaultUrl = 'https://mrvkmideqaeczhfxhobg.supabase.co'
const defaultAnonKey = 'sb_publishable_g0mfcyMMdnEOeoN9_r7WNQ_dN7AhmqP'

const url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || defaultUrl
const anonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || defaultAnonKey

export const supabase = createClient(url, anonKey)
export const isConfigured = true

export async function uploadWebsiteImage(file, folder) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!file?.type?.startsWith('image/')) throw new Error('Please upload an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('website-assets').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

export function publicAssetUrl(path) {
  if (!supabase || !path) return null
  return supabase.storage.from('website-assets').getPublicUrl(path).data.publicUrl
}
