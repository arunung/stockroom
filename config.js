// Supabase connection (safe to commit: the ANON key is public by design — security comes from Row Level Security).
// Alternative: leave this file empty and set SUPABASE_URL / SUPABASE_ANON_KEY as Cloudflare Pages build variables.
// NEVER put the service_role key here.
window.STOCKROOM_CONFIG = {
  supabaseUrl: "",      // e.g. "https://abcdxyz.supabase.co"
  supabaseAnonKey: ""   // Project Settings → API → "anon" / "publishable" key
};
