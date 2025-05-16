
import React from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useToast } from '@/components/ui/use-toast';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Settings = () => {
  const { toast } = useToast();
  const { currentBusiness, businesses, createBusiness } = useBusiness();
  const { user } = useAuth();
  const [businessName, setBusinessName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

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
      await createBusiness(businessName);
      setBusinessName('');
    } catch (error) {
      console.error('Error creating business:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
        <Card className="w-full max-w-md">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          businessName={currentBusiness.name}
          userBusinesses={businesses}
          onBusinessChange={() => {}}
        />
        
        <main className="flex-1 p-6 bg-muted/20">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="p-2 bg-muted rounded-md">{user?.email}</div>
                </div>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <div className="p-2 bg-muted rounded-md text-sm truncate">{user?.id}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Add New Business</CardTitle>
                <CardDescription>Create another business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-business-name">Business Name</Label>
                  <Input
                    id="new-business-name"
                    placeholder="My New Business"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleCreateBusiness}
                  disabled={isLoading || !businessName.trim()}
                >
                  {isLoading ? "Creating..." : "Create Business"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
