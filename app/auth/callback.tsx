import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const navigated = useRef(false);

  useEffect(() => {
    // If we have a user, handle the navigation immediately to Home
    if (user && !navigated.current) {
        navigated.current = true;
        // The user wants direct navigation to home page for both login and signup flows
        router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  return null; // This component doesn't render anything visible
}