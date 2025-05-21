
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Plus, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Product } from '@/types';
import { MobileSaleDialog } from '@/components/MobileSaleDialog';
import { DesktopSaleDialog } from '@/components/DesktopSaleDialog';

interface ProductWithQuantity extends Product {
  quantity: number;
}

const Products = () => {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [products, setProducts] = useState<ProductWithQuantity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithQuantity | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    brand: '',
    price: '',
    cost_price: '',
    quantity: '1',
  });
  const [isEditing, setIsEditing] = useState(false);
  const isMobile = useIsMobile();

  const fetchProducts = async () => {
    if (!currentBusiness) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');
      
      if (error) throw error;
      
      // Transform products to include quantity
      const productsWithQuantity = (data || []).map(product => ({
        ...product,
        quantity: product.quantity || 0
      }));
      
      setProducts(productsWithQuantity);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        variant: "destructive",
        title: "Failed to load products",
        description: error.message || "An error occurred while loading your products.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness) {
      fetchProducts();
    }
  }, [currentBusiness]);

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      brand: '',
      price: '',
      cost_price: '',
      quantity: '1',
    });
    setIsEditing(false);
  };

  const handleEditProduct = (product: ProductWithQuantity) => {
    setFormData({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price.toString(),
      cost_price: product.cost_price.toString(),
      quantity: product.quantity.toString(),
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleOpenSaleDialog = (product: ProductWithQuantity) => {
    setSelectedProduct(product);
    setIsSaleDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted.",
      });
      
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete product",
        description: error.message || "An error occurred while deleting the product.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness) return;
    
    try {
      const productData = {
        name: formData.name,
        brand: formData.brand,
        price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost_price),
        quantity: parseInt(formData.quantity),
        business_id: currentBusiness.id,
      };
      
      let error;
      
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', formData.id);
        
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert([productData]);
        
        error = insertError;
      }
      
      if (error) throw error;
      
      toast({
        title: isEditing ? "Product updated" : "Product added",
        description: isEditing ? 
          "Product has been successfully updated." : 
          "New product has been successfully added.",
      });
      
      resetForm();
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        variant: "destructive",
        title: "Failed to save product",
        description: error.message || "An error occurred while saving the product.",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          businessName={currentBusiness?.name || ''}
          userBusinesses={[]}
          onBusinessChange={() => {}}
        />
        
        <main className="flex-1 p-4 md:p-6 bg-muted/20 pb-20 md:pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  <DialogDescription>
                    {isEditing ? 'Update product details below.' : 'Enter product details below.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Product Name</Label>
                      <Input 
                        id="name" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input 
                        id="brand" 
                        value={formData.brand}
                        onChange={(e) => setFormData({...formData, brand: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="price">Selling Price (UGX)</Label>
                        <Input 
                          id="price" 
                          type="number"
                          step="100" 
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cost_price">Cost Price (UGX)</Label>
                        <Input 
                          id="cost_price" 
                          type="number"
                          step="100" 
                          value={formData.cost_price}
                          onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input 
                        id="quantity" 
                        type="number"
                        min="1" 
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">{isEditing ? 'Update Product' : 'Add Product'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">Loading products...</div>
          ) : (
            <div className="rounded-md border">
              <ScrollArea className="w-full">
                <div className="w-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Brand</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="hidden md:table-cell">Cost</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No products found. Create your first product by clicking "Add Product".
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((product) => (
                          <TableRow key={product.id} className={product.sold ? "bg-muted/30" : ""}>
                            <TableCell className="font-medium">
                              <div>
                                {product.name}
                                <div className="md:hidden text-xs text-muted-foreground">{product.brand}</div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{product.brand}</TableCell>
                            <TableCell>{formatCurrency(product.price)}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatCurrency(product.cost_price)}</TableCell>
                            <TableCell>{product.quantity}</TableCell>
                            <TableCell>
                              {product.sold ? (
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                  Sold
                                </Badge>
                              ) : product.quantity === 0 ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                                  Out of Stock
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                  Available
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col sm:flex-row justify-end gap-2">
                                {!product.sold && product.quantity > 0 && (
                                  <Button 
                                    variant="outline" 
                                    size={isMobile ? "sm" : "default"}
                                    onClick={() => handleOpenSaleDialog(product)}
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                    {isMobile ? "" : "Sell"}
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          )}
        </main>
      </div>

      {isMobile ? (
        <MobileSaleDialog 
          isOpen={isSaleDialogOpen}
          setIsOpen={setIsSaleDialogOpen}
          product={selectedProduct}
          onSaleComplete={fetchProducts}
          formatCurrency={formatCurrency}
        />
      ) : (
        <DesktopSaleDialog 
          isOpen={isSaleDialogOpen}
          setIsOpen={setIsSaleDialogOpen}
          product={selectedProduct}
          onSaleComplete={fetchProducts}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

export default Products;
