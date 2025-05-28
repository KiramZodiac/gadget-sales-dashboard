import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: 'Authentication Timeout',
          description: 'Failed to load authentication state. Please refresh.',
        });
      }
    }, 5000);
//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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [toast]);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
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

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
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
    () => ({ session, user, signInWithGoogle, signOut, isLoading }),
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