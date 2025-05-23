
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface Business {
  id: string;
  name: string;
}

interface BusinessContextProps {
  businesses: Business[];
  currentBusiness: Business | null;
  isLoading: boolean;
  setCurrentBusiness: (business: Business) => void;
  refreshBusinesses: () => Promise<void>;
  createBusiness: (name: string) => Promise<Business | null>;
}

const BusinessContext = createContext<BusinessContextProps | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: React.ReactNode }) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const refreshBusinesses = async () => {
    if (!user) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setBusinesses(data || []);
      
      if (data && data.length > 0 && !currentBusiness) {
        setCurrentBusiness(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching businesses:', error);
      toast({
        variant: "destructive",
        title: "Failed to load businesses",
        description: error.message || "An error occurred while loading your businesses.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBusiness = async (name: string): Promise<Business | null> => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to create a business.",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert([{ name, owner_id: user.id }])
        .select('id, name')
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Business created",
        description: `${name} has been successfully created.`,
      });
      
      await refreshBusinesses();
      setCurrentBusiness(data);
      return data;
    } catch (error: any) {
      console.error('Error creating business:', error);
      toast({
        variant: "destructive",
        title: "Failed to create business",
        description: error.message || "An error occurred while creating your business.",
      });
      return null;
    }
  };

  useEffect(() => {
    refreshBusinesses();
  }, [user]);

  return (
    <BusinessContext.Provider value={{
      businesses,
      currentBusiness,
      isLoading,
      setCurrentBusiness,
      refreshBusinesses,
      createBusiness
    }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
