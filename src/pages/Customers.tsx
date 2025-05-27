import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { debounce } from 'lodash';
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
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
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

interface CustomerFormData extends Omit<Customer, 'business_id' | 'is_default'> {
  id: string;
}

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
    notes: '',
  },
  {
    id: 'delivery',
    name: 'Delivery Customer',
    phone: 'N/A',
    email: '',
    business_id: '',
    is_default: true,
    address: '',
    notes: '',
  },
];

const CustomerForm = memo(
  ({
    formData,
    setFormData,
    onSubmit,
    isEditing,
    onCancel,
    errors,
    isSubmitting,
  }: {
    formData: CustomerFormData;
    setFormData: (data: CustomerFormData) => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    isEditing: boolean;
    onCancel: () => void;
    errors: Partial<Record<keyof CustomerFormData, string>>;
    isSubmitting: boolean;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
          className={errors.phone ? 'border-destructive' : ''}
        />
        {errors.phone && (
          <p id="phone-error" className="text-sm text-destructive">
            {errors.phone}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email}
          </p>
        )}
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
      <DialogFooter className="sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : isEditing
            ? 'Update Customer'
            : 'Add Customer'}
        </Button>
      </DialogFooter>
    </form>
  )
);

const CustomerRow = memo(
  ({
    customer,
    onEdit,
    onDelete,
    onView,
  }: {
    customer: Customer;
    onEdit: (customer: Customer) => void;
    onDelete: (id: string) => void;
    onView: (customer: Customer) => void;
  }) => (
    <TableRow>
      <TableCell className="font-medium">
        {customer.is_default ? (
          <span className="font-bold">{customer.name}</span>
        ) : (
          customer.name
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{customer.phone}</TableCell>
      <TableCell className="hidden md:table-cell">
        {customer.email || '-'}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {customer.address || '-'}
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(customer)}
          aria-label={`View ${customer.name} details`}
        >
          <Eye className="h-4 w-4 mr-1" />{' '}
          <span className="sr-only sm:not-sr-only">View</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(customer)}
          disabled={customer.is_default}
          aria-label={`Edit ${customer.name}`}
        >
          <Edit className="h-4 w-4 mr-1" />{' '}
          <span className="sr-only sm:not-sr-only">Edit</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(customer.id)}
          className="text-destructive hover:text-destructive hover:border-destructive"
          disabled={customer.is_default}
          aria-label={`Delete ${customer.name}`}
        >
          <Trash2 className="h-4 w-4 mr-1" />{' '}
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      </TableCell>
    </TableRow>
  )
);

const Customers = () => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof CustomerFormData, string>>
  >({});
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<CustomerFormData>({
    id: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => setSearchTerm(value), 300),
    []
  );

  const validateForm = (data: CustomerFormData) => {
    const errors: Partial<Record<keyof CustomerFormData, string>> = {};

    if (!data.name.trim()) {
      errors.name = 'Name is required';
    }

    if (data.phone.trim() && !/^\+?[\d\s-]{10,}$/.test(data.phone)) {
      errors.phone = 'Invalid phone number';
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email address';
    }

    return errors;
  };

  const allCustomers = useMemo(() => {
    return [
      ...DEFAULT_CUSTOMERS.map((c) => ({
        ...c,
        business_id: currentBusiness?.id || '',
      })),
      ...customers,
    ];
  }, [customers, currentBusiness]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return allCustomers;

    const term = searchTerm.toLowerCase();
    return allCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term) ||
        (customer.email && customer.email.toLowerCase().includes(term)) ||
        (customer.address && customer.address.toLowerCase().includes(term))
    );
  }, [allCustomers, searchTerm]);

  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, page]);

  const fetchCustomers = useCallback(async () => {
    if (!currentBusiness) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No business selected',
      });
      return;
    }

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
      toast({
        variant: 'destructive',
        title: 'Failed to load customers',
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

    if (!currentBusiness) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No business selected',
      });
      return;
    }

    const errors = validateForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
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
        title: isEditing ? 'Customer updated' : 'Customer added',
        description: `Customer ${formData.name} has been ${
          isEditing ? 'updated' : 'added'
        } successfully.`,
      });

      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An error occurred while saving the customer.',
      });
    } finally {
      setIsSubmitting(false);
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
    setFormErrors({});
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

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (DEFAULT_CUSTOMERS.some((c) => c.id === id)) {
      toast({
        title: 'Cannot delete default customer',
        description: 'Walk-in and Delivery customers are required and cannot be deleted.',
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
        title: 'Customer deleted',
        description: 'Customer has been successfully removed.',
      });

      fetchCustomers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Deletion failed',
        description: error.message || 'Could not delete customer.',
      });
    } finally {
      setIsDeleting(false);
      setCustomerToDelete(null);
    }
  };

  const skeletonRows = Array(5).fill(0).map((_, i) => (
    <TableRow key={i}>
      <TableCell>
        <Skeleton className="h-4 w-[120px]" />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Skeleton className="h-4 w-[100px]" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-[150px]" />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Skeleton className="h-4 w-[200px]" />
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Skeleton className="h-8 w-12 inline-block" />
        <Skeleton className="h-8 w-12 inline-block" />
        <Skeleton className="h-8 w-12 inline-block" />
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader businessName={currentBusiness?.name || ''} />

        <main className="flex-1 p-4 sm:p-6 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Customers</h1>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                  aria-label="Search customers"
                />
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto max-w-[95vw] sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {isEditing ? 'Edit Customer' : 'Add New Customer'}
                    </DialogTitle>
                  </DialogHeader>
                  <CustomerForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleAddOrEditCustomer}
                    isEditing={isEditing}
                    onCancel={resetForm}
                    errors={formErrors}
                    isSubmitting={isSubmitting}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card role="region" aria-label="Customer directory">
            <CardHeader className="pb-2">
              <CardTitle>Customer Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    skeletonRows
                  ) : paginatedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        {searchTerm ? 'No matching customers found' : 'No customers yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                        onEdit={handleEditCustomer}
                        onDelete={handleDeleteClick}
                        onView={handleViewDetails}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
              {filteredCustomers.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {page} of {Math.ceil(filteredCustomers.length / itemsPerPage)}
                  </span>
                  <Button
                    variant="outline"
                    disabled={
                      page === Math.ceil(filteredCustomers.length / itemsPerPage)
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="max-h-[80vh] overflow-y-auto max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Customer Details</DialogTitle>
              </DialogHeader>
              {selectedCustomer && (
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Name</Label>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone || '-'}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.email || '-'}</p>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.address || '-'}</p>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.notes || '-'}</p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsDialogOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Customer'}
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