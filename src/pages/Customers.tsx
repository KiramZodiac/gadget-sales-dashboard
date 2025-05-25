import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useBusiness } from '@/context/BusinessContext';
import { Customer } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

// Default customers that should always exist
const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'walk-in',
    name: 'Walk-in Customer',
    phone: 'N/A',
    email: '',
    business_id: '',
    is_default: true,
    address: '',
    notes: ''
  },
  {
    id: 'delivery',
    name: 'Delivery Customer',
    phone: 'N/A',
    email: '',
    business_id: '',
    is_default: true,
    address: '',
    notes: ''
  }
];

const Customers = () => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // Combine default customers with fetched customers
  const allCustomers = useMemo(() => {
    return [...DEFAULT_CUSTOMERS.map(c => ({
      ...c,
      business_id: currentBusiness?.id || ''
    })), ...customers];
  }, [customers, currentBusiness]);

  const fetchCustomers = useCallback(async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        variant: "destructive",
        title: "Failed to load customers",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAddOrEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentBusiness) return;

    try {
      if (!formData.name.trim() || !formData.phone.trim()) {
        throw new Error('Name and phone are required fields');
      }

      if (isEditing) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            address: formData.address.trim(),
            notes: formData.notes.trim(),
          })
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            address: formData.address.trim(),
            notes: formData.notes.trim(),
            business_id: currentBusiness.id,
          });

        if (error) throw error;
      }

      toast({
        title: isEditing ? "Customer updated" : "Customer added",
        description: `Customer ${formData.name} has been ${isEditing ? 'updated' : 'added'} successfully.`,
      });

      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An error occurred while saving the customer.",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setIsEditing(false);
    setIsDialogOpen(false);
  };

  const handleEditCustomer = (customer: Customer) => {
    setFormData({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    // Prevent deletion of default customers
    if (DEFAULT_CUSTOMERS.some(c => c.id === id)) {
      toast({
        title: "Cannot delete default customer",
        description: "Walk-in and Delivery customers are required and cannot be deleted.",
      });
      return;
    }
    setCustomerToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete);

      if (error) throw error;

      toast({
        title: "Customer deleted",
        description: "Customer has been successfully removed.",
      });

      fetchCustomers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message || "Could not delete customer.",
      });
    } finally {
      setIsDeleting(false);
      setCustomerToDelete(null);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return allCustomers;
    
    const term = searchTerm.toLowerCase();
    return allCustomers.filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      customer.phone.toLowerCase().includes(term) ||
      (customer.email && customer.email.toLowerCase().includes(term)) ||
      (customer.address && customer.address.toLowerCase().includes(term))
    );
  }, [allCustomers, searchTerm]);

  const skeletonRows = Array(5).fill(0).map((_, i) => (
    <TableRow key={i}>
      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
      <TableCell className="text-right space-x-2">
        <Skeleton className="h-8 w-12 inline-block" />
        <Skeleton className="h-8 w-12 inline-block" />
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader businessName={currentBusiness?.name || ""} />

        <main className="flex-1 p-4 md:p-6 bg-muted/20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Customers</h1>
            
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {isEditing ? "Edit Customer" : "Add New Customer"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddOrEditCustomer}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Input
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {isEditing ? "Update Customer" : "Add Customer"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Customer Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    skeletonRows
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        {searchTerm ? "No matching customers found" : "No customers yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.is_default ? (
                            <span className="font-bold">{customer.name}</span>
                          ) : customer.name}
                        </TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>{customer.address || '-'}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                            disabled={customer.is_default}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(customer.id)}
                            className="text-destructive hover:text-destructive hover:border-destructive"
                            disabled={customer.is_default}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <AlertDialog 
            open={!!customerToDelete} 
            onOpenChange={(open) => !open && setCustomerToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the customer 
                  and remove all associated sales records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete Customer"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
};

export default Customers;