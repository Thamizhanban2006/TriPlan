export interface User {
  id: string;
  name: string;
  email: string;
  photo?: string;
  country?: string;
  language?: string;
  totalSpending?: number;
  carbonSaved?: number;
  isAuthenticated: boolean;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: (router?: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}