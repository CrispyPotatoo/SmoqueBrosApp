import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase credentials not found!');
  console.error('❌ Please check your .env file has SUPABASE_URL and SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase credentials');
}

console.log('🔧 Initializing Supabase client...');
console.log('📍 Supabase URL:', SUPABASE_URL?.substring(0, 30) + '...');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
    },
  },
});

console.log('✅ Supabase client initialized');
