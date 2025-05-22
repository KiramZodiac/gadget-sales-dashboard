
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Branch {
  id: string;
  name: string;
  location?: string;
}

const Branches = () => {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const isMobile = useIsMobile();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    location: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  const fetchBranches = async () => {
    if (!currentBusiness) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');
      
      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      toast({
        variant: "destructive",
        title: "Failed to load branches",
        description: error.message || "An error occurred while loading your branches.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [currentBusiness]);

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      location: '',
    });
    setIsEditing(false);
  };

  const handleEditBranch = (branch: Branch) => {
    setFormData({
      id: branch.id,
      name: branch.name,
      location: branch.location || '',
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this branch? This will also delete all sales and inventory records associated with this branch.")) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Branch deleted",
        description: "Branch and all associated records have been successfully deleted.",
      });
      
      fetchBranches();
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete branch",
        description: error.message || "An error occurred while deleting the branch.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness) return;
    
    try {
      const branchData = {
        name: formData.name,
        location: formData.location || null,
        business_id: currentBusiness.id,
      };
      
      let error;
      
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('branches')
          .update(branchData)
          .eq('id', formData.id);
        
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('branches')
          .insert([branchData]);
        
        error = insertError;
      }
      
      if (error) throw error;
      
      toast({
        title: isEditing ? "Branch updated" : "Branch added",
        description: isEditing ? 
          "Branch has been successfully updated." : 
          "New branch has been successfully added.",
      });
      
      resetForm();
      setIsDialogOpen(false);
      fetchBranches();
    } catch (error: any) {
      console.error('Error saving branch:', error);
      toast({
        variant: "destructive",
        title: "Failed to save branch",
        description: error.message || "An error occurred while saving the branch.",
      });
    }
  };

  // Mobile card view
  const BranchCard = ({ branch }: { branch: Branch }) => (
    <div className="bg-card rounded-lg border p-4 mb-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">{branch.name}</h3>
          <p className="text-muted-foreground">{branch.location || 'No location specified'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEditBranch(branch)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleDeleteBranch(branch.id)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          businessName={currentBusiness?.name || ''}
          userBusinesses={[]}
          onBusinessChange={() => {}}
        />
        
        <main className="flex-1 p-4 md:p-6 bg-muted/20 overflow-x-hidden">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">Branches</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Branch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4">
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
                  <DialogDescription>
                    {isEditing ? 'Update branch details below.' : 'Enter branch details below.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Branch Name</Label>
                      <Input 
                        id="name" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location">Location (Optional)</Label>
                      <Input 
                        id="location" 
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">{isEditing ? 'Update Branch' : 'Add Branch'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">Loading branches...</div>
          ) : (
            <>
              {branches.length === 0 ? (
                <div className="text-center p-8 bg-white border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-2">No branches found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first branch by clicking "Add Branch".
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Your First Branch
                  </Button>
                </div>
              ) : (
                <>
                  {isMobile ? (
                    <div className="space-y-2">
                      {branches.map((branch) => (
                        <BranchCard key={branch.id} branch={branch} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden bg-white">
                      <div className="w-full overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {branches.map((branch) => (
                              <TableRow key={branch.id}>
                                <TableCell>{branch.name}</TableCell>
                                <TableCell>{branch.location || 'Not specified'}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleEditBranch(branch)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleDeleteBranch(branch.id)}
                                      disabled={isDeleting}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Branches;
