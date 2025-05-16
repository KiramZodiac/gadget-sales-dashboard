
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BusinessSetupProps {
  onBusinessCreated: (businessId: string, businessName: string) => void;
}

const BusinessSetup = ({ onBusinessCreated }: BusinessSetupProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [businessName, setBusinessName] = useState('');

  const handleCreateBusiness = async () => {
    if (!businessName.trim()) {
      toast({
        variant: "destructive",
        title: "Business name required",
        description: "Please enter a name for your business.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Insert the business into the database
      const { data, error } = await supabase
        .from('businesses')
        .insert([
          { name: businessName, owner_id: user.id }
        ])
        .select('id, name')
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Business created!",
        description: "You can now start setting up your dashboard.",
      });
      
      onBusinessCreated(data.id, data.name);
    } catch (error: any) {
      console.error('Business creation error:', error);
      toast({
        variant: "destructive",
        title: "Failed to create business",
        description: error.message || "An error occurred while creating your business. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Your Business</CardTitle>
        <CardDescription>Let's set up your business profile to get started.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business-name">Business Name</Label>
          <Input
            id="business-name"
            placeholder="My Gadget Store"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleCreateBusiness}
          disabled={isLoading || !businessName.trim()}
        >
          {isLoading ? "Creating..." : "Create Business"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BusinessSetup;
