import { createClient } from '@supabase/supabase-js'

// Read from Vite env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Basic validation helpers
const isValidHttpUrl = (value) => {
  if (typeof value !== 'string') return false
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

if (!isValidHttpUrl(supabaseUrl)) {
  const msg = `Supabase configuration error: VITE_SUPABASE_URL is missing or invalid. Received: ${String(supabaseUrl)}\n` +
    'Set a valid HTTP/HTTPS URL in your environment, e.g.:\n' +
    'VITE_SUPABASE_URL=https://your-project-ref.supabase.co'
  // Throw early to make the problem obvious
  throw new Error(msg)
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim().length < 20) {
  const msg = 'Supabase configuration error: VITE_SUPABASE_ANON_KEY is missing or looks invalid.\n' +
    'Copy the anon public key from your Supabase project settings and set:\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  throw new Error(msg)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)