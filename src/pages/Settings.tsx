import DashboardHeader from "@/components/DashboardHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Sidebar from "@/components/Sidebar";
import { useDebounce } from "use-debounce";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Define TypeScript interfaces
interface Business {
  id: string;
  name: string;
}

interface BusinessContext {
  currentBusiness: Business | null;
  businesses: Business[];
  createBusiness: (name: string) => Promise<void>;
  updateBusiness: (id: string, name: string) => Promise<void>;
  deleteBusinessAndData: (id: string) => Promise<void>;
}

const Settings = () => {
  const { toast } = useToast();
  const { currentBusiness, businesses, createBusiness, updateBusiness, deleteBusinessAndData } = useBusiness() 
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [filterText, setFilterText] = useState('');
  const [debouncedFilterText] = useDebounce(filterText, 300);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [isLoadingDelete, setIsLoadingDelete] = useState<string[]>([]);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  // Input validation
  const validateBusinessName = (name: string): string | null => {
    if (!name.trim()) return "Business name is required";
    if (name.length < 3) return "Business name must be at least 3 characters";
    if (name.length > 50) return "Business name must be less than 50 characters";
    if (!/^[a-zA-Z0-9\s&'-]+$/.test(name)) return "Business name can only contain letters, numbers, spaces, &, ', or -";
    return null;
  };

  const filteredBusinesses = businesses.filter((biz) =>
    biz.name.toLowerCase().includes(debouncedFilterText.toLowerCase())
  );

  const handleCreateBusiness = async () => {
    const validationError = validateBusinessName(businessName);
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Invalid Business Name",
        description: validationError,
      });
      return;
    }

    setIsLoadingCreate(true);
    try {
      await createBusiness(businessName);
      setBusinessName('');
      toast({
        title: "Business Created",
        description: `Successfully created business: ${businessName}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Creating Business",
        description: error.message || "Failed to create business. Please try again.",
      });
    } finally {
      setIsLoadingCreate(false);
    }
  };

  const handleUpdateBusiness = async () => {
    if (!editingBusiness) return;

    const validationError = validateBusinessName(businessName);
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Invalid Business Name",
        description: validationError,
      });
      return;
    }

    setIsLoadingCreate(true);
    try {
      await updateBusiness(editingBusiness.id, businessName);
      setEditingBusiness(null);
      setBusinessName('');
      toast({
        title: "Business Updated",
        description: `Successfully updated business: ${businessName}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Updating Business",
        description: error.message || "Failed to update business. Please try again.",
      });
    } finally {
      setIsLoadingCreate(false);
    }
  };

  const handleDelete = async (bizId: string, bizName: string) => {
    setIsLoadingDelete((prev) => [...prev, bizId]);
    try {
      await deleteBusinessAndData(bizId);
      toast({
        title: "Business Deleted",
        description: `Successfully deleted business: ${bizName}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Deleting Business",
        description: error.message || `Failed to delete business: ${bizName}. Please try again.`,
      });
    } finally {
      setIsLoadingDelete((prev) => prev.filter((id) => id !== bizId));
      setDeleteDialogOpen(null);
    }
  };

  const startEditing = (biz: Business) => {
    setEditingBusiness(biz);
    setBusinessName(biz.name);
  };

  // No businesses view
  if (!businesses || businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Your First Business</CardTitle>
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
              disabled={isLoadingCreate || !!validateBusinessName(businessName)}
            >
              {isLoadingCreate ? "Creating..." : "Create Business"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Full UI with businesses
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader
          businessName={currentBusiness?.name || ''}
          userBusinesses={filteredBusinesses}
          onBusinessChange={() => {}}
        />
        <main className="flex-1 p-4 sm:p-6 bg-muted/20">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Settings</h1>

          <div className="mb-6">
            <Label htmlFor="filter-business">Filter Businesses</Label>
            <Input
              id="filter-business"
              placeholder="Search businesses..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full sm:max-w-md mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {filteredBusinesses.map((biz) => (
              <Card key={biz.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center text-base sm:text-lg">
                    <span className="truncate">{biz.name}</span>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(biz)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Pencil size={16} />
                      </Button>
                      <AlertDialog open={deleteDialogOpen === biz.id} onOpenChange={(open) => setDeleteDialogOpen(open ? biz.id : null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoadingDelete.includes(biz.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            {isLoadingDelete.includes(biz.id) ? (
                              <span className="animate-spin">⌛</span>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Business</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{biz.name}" and all its data? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(biz.id, biz.name)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
              <CardTitle>{editingBusiness ? "Edit Business" : "Add New Business"}</CardTitle>
              <CardDescription>
                {editingBusiness ? "Update your business name" : "Create another business"}
              </CardDescription>
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
            <CardFooter className="flex space-x-2">
              <Button
                onClick={editingBusiness ? handleUpdateBusiness : handleCreateBusiness}
                disabled={isLoadingCreate || !!validateBusinessName(businessName)}
              >
                {isLoadingCreate ? "Processing..." : editingBusiness ? "Update Business" : "Create Business"}
              </Button>
              {editingBusiness && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingBusiness(null);
                    setBusinessName('');
                  }}
                >
                  Cancel
                </Button>
              )}
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Settings;