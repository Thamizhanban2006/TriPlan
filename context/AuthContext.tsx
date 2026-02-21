import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthContextType } from '../types/auth';
import { supabase, signInWithGoogle as supabaseSignInWithGoogle, signOut as supabaseSignOut, onAuthStateChange, getCurrentUser } from '../services/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';



const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Using Supabase OAuth directly, no need for separate Google auth hook

  // The Google OAuth response is now handled by Supabase directly
  // The onAuthStateChange listener will handle the user state

  useEffect(() => {
    // Load user data on component mount
    loadUserData();

    // Listen for Supabase auth changes
    const authListener = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in via Supabase
        const userData: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email!,
          photo: session.user.user_metadata?.avatar_url,
          isAuthenticated: true,
        };

        AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        AsyncStorage.removeItem('user');
        setUser(null);
      }
    });

    // Cleanup function to unsubscribe
    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async () => {
    try {
      // Check if user is already authenticated with Supabase
      const user = await getCurrentUser();

      if (user) {
        // User is already logged in via Supabase
        const userData: User = {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email!,
          photo: user.user_metadata?.avatar_url,
          isAuthenticated: true,
        };

        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return; // Exit early if user is found in Supabase session
      }

      // Fallback to locally stored user data
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (idToken: string, userInfo: any) => {
    // This function is not needed when using Supabase OAuth flow directly
    // The authentication will be handled by Supabase automatically
    setIsLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting Google sign in...');

      // Use the Supabase service function to get the OAuth URL
      const result = await supabaseSignInWithGoogle();

      if (!result?.url) {
        throw new Error('Failed to get OAuth URL from Supabase');
      }

      console.log('Opening browser for OAuth...');
      // Open the browser and wait for it to complete
      const browserResult = await WebBrowser.openAuthSessionAsync(
        result.url,
        Linking.createURL('auth/callback')
      );

      console.log('Browser result:', browserResult);

      if (browserResult.type === 'success' && browserResult.url) {
        // Parse the returned URL for the session tokens
        const url = browserResult.url;
        console.log('Received callback URL:', url);

        // Use Linking to parse the fragment/query
        const parsed = Linking.parse(url);
        const { access_token, refresh_token } = parsed.queryParams || {};

        // If they are in the fragment (standard Supabase OAuth)
        let finalAccessToken = access_token;
        let finalRefreshToken = refresh_token;

        if (!finalAccessToken && url.includes('#')) {
          const fragment = url.split('#')[1];
          const fragmentParams = new URLSearchParams(fragment);
          finalAccessToken = fragmentParams.get('access_token') as string | undefined;
          finalRefreshToken = fragmentParams.get('refresh_token') as string | undefined;
        }

        if (finalAccessToken && finalRefreshToken) {
          console.log('Tokens found, setting session...');
          const { error: sessionError } = await supabase!.auth.setSession({
            access_token: finalAccessToken as string,
            refresh_token: finalRefreshToken as string,
          });

          if (sessionError) throw sessionError;
          console.log('Session set successfully');
        } else {
          console.log('No tokens found in URL');
        }
      } else if (browserResult.type === 'cancel') {
        console.log('User cancelled sign in');
      }

    } catch (error: any) {
      console.error('Error during Google sign in:', error?.message || error);
      alert(`Sign in failed: ${error?.message || 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);

      // Use the Supabase service function
      await supabaseSignOut();

      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}