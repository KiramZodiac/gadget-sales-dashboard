import DashboardHeader from "@/components/DashboardHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Sidebar from "@/components/Sidebar";

const Settings = () => {
  const { toast } = useToast();
  const { currentBusiness, businesses, createBusiness, deleteBusinessAndData } = useBusiness();
  const { user } = useAuth();
  const [businessName, setBusinessName] = React.useState('');
  const [filterText, setFilterText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const filteredBusinesses = businesses.filter((biz) =>
    biz.name.toLowerCase().includes(filterText.toLowerCase())
  );

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

  const handleDelete = async (bizId: string) => {
    const confirm = window.confirm('Are you sure you want to delete this business and all its data?');
    if (!confirm) return;

    try {
      await deleteBusinessAndData(bizId);
      toast({
        title: "Business deleted",
        description: "The business and its related data have been removed.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error deleting",
        description: "Something went wrong while deleting the business.",
      });
    }
  };

  // ✅ Redirect UI if there are no businesses
  if (!businesses || businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Your Business</CardTitle>
            <CardDescription>Start by creating your first business.</CardDescription>
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

  // ✅ Full UI once business exists
  return (
    <div className="min-h-screen flex">
  <Sidebar/>
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          businessName={currentBusiness?.name || ''}
          userBusinesses={filteredBusinesses}
          onBusinessChange={() => {}}
        />
        
        <main className="flex-1 p-6 bg-muted/20">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>

          <div className="mb-6">
            <Label htmlFor="filter-business">Filter Businesses</Label>
            <Input
              id="filter-business"
              placeholder="Search businesses..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="max-w-md mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {filteredBusinesses.map((biz) => (
              <Card key={biz.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {biz.name}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(biz.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground truncate">
                    ID: {biz.id}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

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
        </main>
      </div>
    </div>
  );
};

export default Settings;
