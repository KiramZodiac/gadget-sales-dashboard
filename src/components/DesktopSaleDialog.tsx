import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  cost_price: number;
  quantity: number;
}

interface DesktopSaleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  product: Product | null;
  onSaleComplete: () => void;
  formatCurrency: (amount: number) => string;
}

export function DesktopSaleDialog({ 
  isOpen, 
  setIsOpen, 
  product, 
  onSaleComplete,
  formatCurrency
}: DesktopSaleDialogProps) {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [quantity, setQuantity] = useState('1');
  const [branches, setBranches] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('no-customer');
  const [isLoading, setIsLoading] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    type:'walk in'
  });

  // Fetch branches and customers when the dialog opens
  useEffect(() => {
    if (isOpen && currentBusiness && product) {
      setIsLoadingData(true);
      fetchBranchesAndCustomers();
      setQuantity('1');
      setSalePrice(product.price.toString());
      setShowAddCustomer(false);
    }
  }, [isOpen, product, currentBusiness]);

  const fetchBranchesAndCustomers = async () => {
    if (!currentBusiness) return;
    
    try {
      // Fetch branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', currentBusiness.id);
      
      if (branchesError) throw branchesError;
      setBranches(branchesData || []);
      
      if (branchesData && branchesData.length > 0) {
        setBranchId(branchesData[0].id);
      } else {
        setBranchId('');
      }
      
      // Fetch customers
      await fetchCustomers();
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: error.message,
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchCustomers = async () => {
    if (!currentBusiness) return;
    
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', currentBusiness.id);
    
    if (customersError) throw customersError;
    setCustomers(customersData || []);
  };

  const handleAddCustomer = async () => {
    if (!currentBusiness) return;
    
    if (!newCustomer.name.trim()) {
      toast({
        variant: "destructive",
        title: "Name is required",
        description: "Please enter a customer name.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name.trim(),
          email: newCustomer.email.trim(),
          phone: newCustomer.phone.trim(),
          business_id: currentBusiness.id,
          type:newCustomer.type
        }])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Update customers list and select the new customer
        await fetchCustomers();
        setCustomerId(data[0].id);
        setShowAddCustomer(false);
        setNewCustomer({
          name: '',
          email: '',
          phone: '',
          type:"walk in"
        });
        
        toast({
          title: "Customer added",
          description: "New customer created successfully.",
        });
      }
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast({
        variant: "destructive",
        title: "Failed to add customer",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSale = async () => {
    if (!product || !currentBusiness) {
      toast({
        variant: "destructive",
        title: "Unable to process sale",
        description: "Missing required information to complete the sale.",
      });
      return;
    }
    
    if (!branchId) {
      toast({
        variant: "destructive",
        title: "No branch selected",
        description: "Please create at least one branch before selling products.",
      });
      return;
    }
    
    const saleQuantity = parseInt(quantity);
    const finalSalePrice = parseFloat(salePrice);
    
    if (isNaN(saleQuantity) || saleQuantity <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid quantity",
        description: "Please enter a valid quantity.",
      });
      return;
    }
    
    if (isNaN(finalSalePrice) || finalSalePrice <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid price",
        description: "Please enter a valid selling price.",
      });
      return;
    }
    
    if (saleQuantity > product.quantity) {
      toast({
        variant: "destructive",
        title: "Insufficient quantity",
        description: `Only ${product.quantity} available in stock.`,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const now = new Date().toISOString();
      const totalPrice = finalSalePrice * saleQuantity;
      
      // Create a sale record
      const { error: saleError } = await supabase
        .from('sales')
        .insert([{
          product_id: product.id,
          branch_id: branchId,
          customer_id: customerId === 'no-customer' ? null : customerId,
          quantity: saleQuantity,
          total: totalPrice,
          business_id: currentBusiness.id,
          date: now
        }]);
      
      if (saleError) throw saleError;
      
      // Update product quantity
      const newQuantity = product.quantity - saleQuantity;
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          quantity: newQuantity,
          sold: newQuantity <= 0
        })
        .eq('id', product.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Product sold successfully",
        description: `Sold ${saleQuantity} of ${product.name} for ${formatCurrency(totalPrice)}.`,
      });
      
      setIsOpen(false);
      onSaleComplete();
    } catch (error: any) {
      console.error('Error processing sale:', error);
      toast({
        variant: "destructive",
        title: "Sale failed",
        description: error.message || "An error occurred while processing the sale.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) return null;

  // Calculate the total price based on quantity and updated sale price
  const totalPrice = parseFloat(salePrice || '0') * parseInt(quantity || '0');
  const noBranches = branches.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sell Product</DialogTitle>
          <DialogDescription>
            Complete the sale for {product.name}
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingData ? (
          <div className="py-8 text-center">Loading...</div>
        ) : noBranches ? (
          <div className="py-6 space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to create at least one branch before you can sell products.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/branches';
              }}
              className="w-full"
            >
              Go to Branches Page
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Product</Label>
                <div>{product.name}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Brand</Label>
                <div>{product.brand}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Available</Label>
                <div>{product.quantity} units</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Suggested Price</Label>
                <div>{formatCurrency(product.price)}</div>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="salePrice">Selling Price (UGX)</Label>
              <Input 
                id="salePrice" 
                type="number"
                min="0"
                step="100"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity to Sell</Label>
              <Input 
                id="quantity" 
                type="number"
                min="1"
                max={product.quantity.toString()}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer (Optional)</Label>
              {showAddCustomer ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Customer Name *"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  />
                  <Input
                    placeholder="Phone"
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />

               <div className="grid gap-2">
              <Label>Customer Type</Label>
                 <Select 
                  value={newCustomer.type}
                     onValueChange={(value) => setNewCustomer({...newCustomer, type: value})}
                                    >
                          <SelectTrigger>
                         <SelectValue placeholder="Select type" />
                       </SelectTrigger>
        <SelectContent>
          <SelectItem value="walk-in">Walk-in</SelectItem>
          <SelectItem value="delivery">Delivery</SelectItem>
        </SelectContent>
      </Select>
    </div>
                 <div className="flex gap-2">
                    <Button
                      onClick={handleAddCustomer}
                      disabled={isLoading || !newCustomer.name.trim()}
                      size="sm"
                      className="flex-1"
                    >
                      {isLoading ? 'Saving...' : 'Save Customer'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddCustomer(false)}
                      size="sm"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select 
                    value={customerId} 
                    onValueChange={setCustomerId}
                    
                  >
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-customer">Walk-in Customer</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.type === 'walk-in' ? 'Walk-in' : 'Delivery'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAddCustomer(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="pt-2 border-t mt-2">
              <Label className="text-sm font-medium">Total Sale Price</Label>
              <div className="text-lg font-bold">{formatCurrency(totalPrice)}</div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button
            onClick={handleSale}
            disabled={
              isLoading || 
              isLoadingData || 
              noBranches || 
              parseInt(quantity) <= 0 || 
              parseInt(quantity) > product.quantity || 
              parseFloat(salePrice) <= 0 ||
              showAddCustomer
            }
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}