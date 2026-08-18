const SUPABASE_URL = "https://fmcgaxqkydsmfwjlhyzs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Y8_j5MJF5My5eJ1beiKaWw_FYZfuNmN";

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
