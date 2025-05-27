
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
  deleteBusinessAndData: (bizId: string) => Promise<void>;
updateBusiness: (id: string, name: string) => Promise<void>;



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

  const updateBusiness = async (id: string, name: string) => {
    // Updated implementation to handle both id and name
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to update a business.",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ name })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Business updated",
        description: `The business has been successfully updated to ${name}.`,
      });

      await refreshBusinesses();
    }
    catch (error: any) {
      console.error('Error updating business:', error);
      toast({
        variant: "destructive",
        title: "Failed to update business",
        description: error.message || "An error occurred while updating the business.",
      });
    }
  };


  const deleteBusinessAndData = async (bizId: string): Promise<void> => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to delete a business.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', bizId);

      if (error) throw error;

      toast({
        title: "Business deleted",
        description: "The business and its data have been successfully deleted.",
      });

      await refreshBusinesses();
    } catch (error: any) {
      console.error('Error deleting business:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete business",
        description: error.message || "An error occurred while deleting the business.",
      });
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
      createBusiness,
      deleteBusinessAndData,
      updateBusiness
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
