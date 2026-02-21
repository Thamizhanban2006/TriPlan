import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      // Supabase should handle the session automatically through onAuthStateChange
      // Just redirect back to the profile page
      setTimeout(() => {
        router.back(); // Go back to previous screen (profile)
      }, 1000);
    };

    handleAuthCallback();
  }, [params]);

  return null; // This component doesn't render anything visible
}