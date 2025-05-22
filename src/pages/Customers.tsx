import React, { useState, useEffect } from 'react';
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
  TableRow
} from '@/components/ui/table';
import { Plus, Search } from 'lucide-react';
import { useBusiness } from '@/context/BusinessContext';
import { Customer } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const Customers = () => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // State for edit mode
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (currentBusiness) {
      fetchCustomers();
    }
  }, [currentBusiness]);

  const fetchCustomers = async () => {
    if (!currentBusiness) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');

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
  };

  const handleAddOrEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentBusiness) return;

    try {
      let error;

      if (isEditing) {
        // Update customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
          })
          .eq('id', formData.id);

        error = updateError;
      } else {
        // Add new customer
        const { error: insertError } = await supabase
          .from('customers')
          .insert([
            {
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
              business_id: currentBusiness.id,
            },
          ]);

        error = insertError;
      }

      if (error) throw error;

      toast({
        title: isEditing ? "Customer updated" : "Customer added",
        description: isEditing
          ? "Customer has been successfully updated."
          : "New customer has been successfully added.",
      });

      setIsDialogOpen(false);
      setFormData({ id: '', name: '', phone: '', email: '' });
      setIsEditing(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        variant: "destructive",
        title: "Failed to save customer",
        description: error.message || "An error occurred while saving the customer.",
      });
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setFormData({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Customer deleted",
        description: "Customer has been successfully deleted.",
      });

      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete customer",
        description: error.message || "An error occurred while deleting the customer.",
      });
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader businessName={currentBusiness?.name || ""} />

        <main className="flex-1 p-6 bg-muted/20">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Customers</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setFormData({ id: '', name: '', phone: '', email: '' });
                  setIsEditing(false);
                  setIsDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add New Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditing ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddOrEditCustomer}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
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
                  </div>
                  <DialogFooter>
                    <Button type="submit">{isEditing ? "Update Customer" : "Add Customer"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-[400px]"
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>All Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  Loading customer data...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          No customers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>{customer.email || 'Not provided'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCustomer(customer)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Customers;
