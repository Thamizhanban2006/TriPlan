import { useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const navigated = useRef(false);

  useEffect(() => {
    // If we have a user, handle the navigation immediately
    if (user && !navigated.current) {
        navigated.current = true;
        router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  return null; // This component doesn't render anything visible
}