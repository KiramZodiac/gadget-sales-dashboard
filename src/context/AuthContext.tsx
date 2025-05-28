import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch initial session
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching initial session:', error);
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Failed to load initial authentication state.',
          });
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      } catch (error: any) {
        console.error('Unexpected error fetching session:', error);
        setIsLoading(false);
      }
    };

    fetchSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        if (event === 'SIGNED_IN' && session) {
          toast({
            title: 'Welcome!',
            description: 'You have successfully signed in.',
          });
          navigate('/dashboard');
        }
      }
    );

    // Timeout for slow session loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Authentication timeout triggered');
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: 'Authentication Timeout',
          description: 'Failed to load authentication state. Please refresh.',
        });
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [toast, navigate]);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'email profile',
        },
      });
      if (error) throw error;
      toast({
        title: 'Redirecting to Google',
        description: 'You are being redirected to sign in with Google.',
      });
    } catch (error: any) {
      console.error('Error signing in with Google:', error.message);
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message || 'An error occurred while signing in with Google.',
      });
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast({
        title: 'Welcome back!',
        description: 'You’ve successfully logged in.',
      });
    } catch (error: any) {
      console.error('Authentication error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
    } catch (error: any) {
      console.error('Authentication error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      toast({
        variant: 'destructive',
        title: 'Sign out failed',
        description: error.message || 'An error occurred while signing out.',
      });
    }
  };

  const value = React.useMemo(
    () => ({ session, user, signInWithGoogle, signInWithPassword, signUp, signOut, isLoading }),
    [session, user, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};