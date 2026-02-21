import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or ANON KEY in environment variables');
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Reusable authentication functions
export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  console.log('Initiating Google OAuth with Supabase...');

  // Dynamically create the redirect URL using expo-linking
  const redirectTo = Linking.createURL('auth/callback');
  console.log('Redirecting to:', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Supabase Google OAuth error:', error.message);
    throw error;
  }

  console.log('Supabase OAuth result:', data);
  return data;
};

export const signOut = async () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  if (!supabase) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  if (!supabase) {
    return {
      data: {
        subscription: { unsubscribe: () => { } }
      }
    };
  }

  return supabase.auth.onAuthStateChange(callback);
};