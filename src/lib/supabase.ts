import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* A single lazily-created Supabase client, used ONLY for ephemeral Realtime
   channels (presence + broadcast). No auth, no database. Returns null when the
   project isn't configured, which flips the app into local (BroadcastChannel)
   demo mode. */

let client: SupabaseClient | null = null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 40 } },
    });
  }
  return client;
}
