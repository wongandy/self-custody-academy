import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Read the auth callback params BEFORE createClient runs: the client consumes and
// clears the URL hash during its async init, and the PASSWORD_RECOVERY event it
// emits can fire before React has subscribed to auth changes.
function readAuthCallback() {
  if (typeof window === 'undefined') return { isRecovery: false, errorCode: null as string | null };
  const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const hash = new URLSearchParams(raw);
  const query = new URLSearchParams(window.location.search);
  const type = hash.get('type') ?? query.get('type');
  const errorCode = hash.get('error_code') ?? query.get('error_code') ?? hash.get('error') ?? query.get('error');
  return { isRecovery: type === 'recovery' && !errorCode, errorCode };
}

export const initialAuthCallback = readAuthCallback();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
