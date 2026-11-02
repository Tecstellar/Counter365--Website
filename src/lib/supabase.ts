import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://tziqjkklqtmjlncoraba.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CkIw1TkmOb9qbIVd8Lb0RA_8FCAHfli';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
