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
    const authListener = onAuthStateChange(async (event, session) => {
      if (!supabase) return;

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Immediately set basic user info while we fetch profile
        const basicUserData: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email!,
          photo: session.user.user_metadata?.avatar_url,
          totalSpending: 0,
          carbonSaved: 0,
          isAuthenticated: true,
        };
        setUser(basicUserData);

        // Fetch extra user data from public.users table in background
        try {
          let { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          }

          // Auto-create profile if missing
          if (!profile) {
            const { data: neu, error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                full_name: basicUserData.name,
                avatar_url: basicUserData.photo,
                total_spending: 0,
                carbon_saved: 0
              })
              .select()
              .single();
            
            if (insertError) {
              console.error('Initial profile creation failed:', insertError);
            }
            profile = neu;
          }

          if (profile) {
            const userData: User = {
              ...basicUserData,
              name: profile.full_name || basicUserData.name,
              country: profile.country,
              language: profile.language,
              totalSpending: profile.total_spending || 0,
              carbonSaved: profile.carbon_saved || 0,
            };

            AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
          }
        } catch (profileError) {
          console.error('Profile fetch failed:', profileError);
        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        AsyncStorage.removeItem('user');
        setUser(null);
        setIsLoading(false);
      }
    });

    // Cleanup function to unsubscribe
    return () => {
      if (authListener?.data?.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, []);

  const loadUserData = async () => {
    try {
      if (!supabase) {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
        return;
      }

      // Check if user is already authenticated with Supabase
      const user = await getCurrentUser();

      if (user) {
        // User is already logged in via Supabase
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        const userData: User = {
          id: user.id,
          name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email!,
          photo: user.user_metadata?.avatar_url,
          country: profile?.country,
          language: profile?.language,
          totalSpending: profile?.total_spending || 0,
          carbonSaved: profile?.carbon_saved || 0,
          isAuthenticated: true,
        };

        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else {
        // Fallback to locally stored user data
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
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
      if (!supabase) {
        alert('Supabase is not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY.');
        return;
      }

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
          // Robust token extraction for fragmented URLs
          const parts = fragment.split('&');
          parts.forEach(part => {
              const pair = part.split('=');
              if (pair[0] === 'access_token') finalAccessToken = pair[1];
              if (pair[0] === 'refresh_token') finalRefreshToken = pair[1];
          });
        }

        if (finalAccessToken && finalRefreshToken) {
          console.log('Tokens found, setting session...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: finalAccessToken as string,
            refresh_token: finalRefreshToken as string,
          });

          if (sessionError) throw sessionError;
          console.log('Session set successfully');
          
          // Manual wait ensuring onAuthStateChange has had time to trigger
          // Or manually fetch user here for immediate UI update
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          if (supabaseUser) {
            const basicUser: User = {
                id: supabaseUser.id,
                name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
                email: supabaseUser.email!,
                photo: supabaseUser.user_metadata?.avatar_url,
                totalSpending: 0,
                carbonSaved: 0,
                isAuthenticated: true,
            };
            setUser(basicUser);
            setIsLoading(false);
          }
        } else {
          console.log('No tokens found in URL');
          setIsLoading(false);
        }
      } else {
        console.log('Browser result not success:', browserResult.type);
        setIsLoading(false);
      }

    } catch (error: any) {
      console.error('Error during Google sign in:', error?.message || error);
      alert(`Sign in failed: ${error?.message || 'Unknown error occurred'}`);
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user?.id || !supabase) return;
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        const updatedUser: User = {
          ...user,
          name: profile.full_name || user.name,
          country: profile.country,
          language: profile.language,
          totalSpending: profile.total_spending || 0,
          carbonSaved: profile.carbon_saved || 0,
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error("Error refreshing profile:", e);
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
    refreshProfile
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