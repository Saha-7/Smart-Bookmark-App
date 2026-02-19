import { createBrowserClient } from '@supabase/ssr'

// Creates a Supabase client for use in the browser (client components)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}