
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

  // Fetch branches and customers when the dialog opens
  useEffect(() => {
    if (isOpen && currentBusiness && product) {
      fetchBranchesAndCustomers();
      setQuantity('1');
      setSalePrice(product.price.toString());
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
        toast({
          title: "No branches found",
          description: "Please create at least one branch before selling products.",
          variant: "destructive"
        });
      }
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', currentBusiness.id);
      
      if (customersError) throw customersError;
      setCustomers(customersData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: error.message,
      });
    }
  };

  const handleSale = async () => {
    if (!product || !currentBusiness || !branchId) {
      toast({
        variant: "destructive",
        title: "Unable to process sale",
        description: !branchId ? "Please create a branch first." : "Missing required information to complete the sale.",
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
      
      if (newQuantity > 0) {
        // If there are products left, update quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', product.id);
        
        if (updateError) throw updateError;
      } else {
        // If no products left, mark as sold
        const { error: updateError } = await supabase
          .from('products')
          .update({
            quantity: 0,
            sold: true,
            sale_date: now
          })
          .eq('id', product.id);
        
        if (updateError) throw updateError;
      }
      
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sell Product</DialogTitle>
          <DialogDescription>
            Complete the sale for {product.name}
          </DialogDescription>
        </DialogHeader>
        
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
                {branches.length === 0 ? (
                  <SelectItem value="" disabled>No branches available - create a branch first</SelectItem>
                ) : (
                  branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="customer">Customer (Optional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-customer">Walk-in Customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="pt-2 border-t mt-2">
            <Label className="text-sm font-medium">Total Sale Price</Label>
            <div className="text-lg font-bold">{formatCurrency(totalPrice)}</div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            onClick={handleSale}
            disabled={isLoading || parseInt(quantity) <= 0 || parseInt(quantity) > product.quantity || branches.length === 0 || parseFloat(salePrice) <= 0}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
