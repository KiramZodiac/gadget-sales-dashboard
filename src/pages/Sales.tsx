
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
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { useBusiness } from '@/context/BusinessContext';
import { Sale } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SaleFormData {
  product_id: string;
  branch_id: string;
  customer_id: string;
  quantity: string;
  total: string;
  date: string;
}

const Sales = () => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<SaleFormData>({
    product_id: '',
    branch_id: '',
    customer_id: '',
    quantity: '1',
    total: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  useEffect(() => {
    if (currentBusiness) {
      fetchSales();
      fetchLookupData();
    }
  }, [currentBusiness]);
  
  // When product changes, update the total based on price * quantity
  useEffect(() => {
    if (formData.product_id && formData.quantity) {
      const product = products.find(p => p.id === formData.product_id);
      if (product) {
        const total = product.price * Number(formData.quantity);
        setFormData(prev => ({ ...prev, total: total.toString() }));
      }
    }
  }, [formData.product_id, formData.quantity, products]);
  
  const fetchSales = async () => {
    if (!currentBusiness) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          product:products(*),
          branch:branches(*),
          customer:customers(*)
        `)
        .eq('business_id', currentBusiness.id)
        .order('date', { ascending: false });
        
      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      toast({
        variant: "destructive",
        title: "Failed to load sales",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchLookupData = async () => {
    if (!currentBusiness) return;
    
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .eq('sold', false);
      
      if (productsError) throw productsError;
      setProducts(productsData || []);
      
      // Fetch branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', currentBusiness.id);
      
      if (branchesError) throw branchesError;
      setBranches(branchesData || []);
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', currentBusiness.id);
      
      if (customersError) throw customersError;
      setCustomers(customersData || []);
    } catch (error: any) {
      console.error('Error fetching lookup data:', error);
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: error.message,
      });
    }
  };
  
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness) return;
    
    try {
      const product = products.find(p => p.id === formData.product_id);
      if (!product) throw new Error("Product not found");
      
      // Convert form data
      const newSale = {
        product_id: formData.product_id,
        branch_id: formData.branch_id,
        customer_id: formData.customer_id || null,
        quantity: Number(formData.quantity),
        total: Number(formData.total),
        date: new Date(formData.date).toISOString(),
        business_id: currentBusiness.id
      };
      
      // Add the sale
      const { error: saleError } = await supabase
        .from('sales')
        .insert([newSale]);
      
      if (saleError) throw saleError;
      
      // Mark the product as sold
      const { error: productError } = await supabase
        .from('products')
        .update({
          sold: true,
          sale_date: new Date().toISOString()
        })
        .eq('id', formData.product_id);
      
      if (productError) throw productError;
      
      toast({
        title: "Sale added successfully",
        description: "The sale has been recorded and the product marked as sold.",
      });
      
      setIsDialogOpen(false);
      fetchSales();
      fetchLookupData();
      
      // Reset form
      setFormData({
        product_id: '',
        branch_id: '',
        customer_id: '',
        quantity: '1',
        total: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error('Error adding sale:', error);
      toast({
        variant: "destructive",
        title: "Failed to add sale",
        description: error.message,
      });
    }
  };
  
  // Calculate profit on each sale
  const calculateProfit = (sale: Sale) => {
    if (!sale.product) return 0;
    const costPrice = sale.product.cost_price * sale.quantity;
    return sale.total - costPrice;
  };
  
  // Filter sales based on search term
  const filteredSales = sales.filter(sale => 
    sale.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.branch?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          businessName={currentBusiness?.name || ""}
          userBusinesses={[]}
          onBusinessChange={() => {}}
        />
        
        <main className="flex-1 p-6 bg-muted/20">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Sales</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add New Sale
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Sale</DialogTitle>
                  <DialogDescription>
                    Record a new sale for your business
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSale}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="product">Product</Label>
                      <Select 
                        value={formData.product_id}
                        onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                        required
                      >
                        <SelectTrigger id="product">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ${product.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="branch">Branch</Label>
                      <Select 
                        value={formData.branch_id}
                        onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                        required
                      >
                        <SelectTrigger id="branch">
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="customer">Customer (Optional)</Label>
                      <Select 
                        value={formData.customer_id}
                        onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                      >
                        <SelectTrigger id="customer">
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Walk-in Customer</SelectItem>
                          {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input 
                          id="quantity" 
                          type="number" 
                          min="1" 
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="total">Total Price</Label>
                        <Input 
                          id="total" 
                          type="number" 
                          step="0.01"
                          value={formData.total}
                          onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="date">Sale Date</Label>
                      <Input 
                        id="date" 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit">Add Sale</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search sales..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-[400px]"
            />
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>All Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  Loading sales data...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Profit/Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          No sales found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sale) => {
                        const profit = calculateProfit(sale);
                        const isProfitable = profit >= 0;
                        
                        return (
                          <TableRow key={sale.id}>
                            <TableCell>
                              {new Date(sale.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">{sale.product?.name || 'Unknown'}</TableCell>
                            <TableCell>{sale.branch?.name || 'Unknown'}</TableCell>
                            <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                            <TableCell>{sale.quantity}</TableCell>
                            <TableCell>${sale.total.toFixed(2)}</TableCell>
                            <TableCell className={`text-right font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfitable ? '+' : ''}{profit.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })
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

export default Sales;
