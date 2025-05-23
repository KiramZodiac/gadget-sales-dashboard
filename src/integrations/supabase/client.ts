
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ivcubvmhqlfstdqawgqu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2Y3Vidm1ocWxmc3RkcWF3Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMjg3NjMsImV4cCI6MjA2MjcwNDc2M30.zET62o634dpecYXWpL65W7SZb2a3L1quumAQ8z_riE0";

// Configure the Supabase client with persistence options
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true
    }
  }
);
