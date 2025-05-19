
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
import { Plus, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  cost_price: number;
  image_url?: string;
  sold?: boolean;
  sale_date?: string;
}

const Products = () => {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    brand: '',
    price: '',
    cost_price: '',
  });
  const [isEditing, setIsEditing] = useState(false);

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
      setProducts(data || []);
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
    });
    setIsEditing(false);
  };

  const handleEditProduct = (product: Product) => {
    setFormData({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price.toString(),
      cost_price: product.cost_price.toString(),
    });
    setIsEditing(true);
    setIsDialogOpen(true);
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

  const handleMarkAsSold = async (product: Product) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('products')
        .update({
          sold: true,
          sale_date: now
        })
        .eq('id', product.id);
      
      if (error) throw error;
      
      // Create a sale record
      const { error: saleError } = await supabase
        .from('sales')
        .insert([{
          product_id: product.id,
          branch_id: product.branch_id || (await getDefaultBranchId()),
          quantity: 1,
          total: product.price,
          business_id: currentBusiness?.id,
          date: now
        }]);
      
      if (saleError) throw saleError;
      
      toast({
        title: "Product marked as sold",
        description: "Product has been successfully marked as sold.",
      });
      
      fetchProducts();
    } catch (error: any) {
      console.error('Error marking product as sold:', error);
      toast({
        variant: "destructive",
        title: "Failed to mark product as sold",
        description: error.message || "An error occurred while marking the product as sold.",
      });
    }
  };

  // Helper function to get a default branch ID if needed
  const getDefaultBranchId = async (): Promise<string> => {
    if (!currentBusiness) throw new Error("No business selected");
    
    const { data, error } = await supabase
      .from('branches')
      .select('id')
      .eq('business_id', currentBusiness.id)
      .limit(1)
      .single();
    
    if (error || !data) {
      // If no branch exists, create a default one
      const { data: newBranch, error: createError } = await supabase
        .from('branches')
        .insert({
          name: 'Main Branch',
          business_id: currentBusiness.id
        })
        .select('id')
        .single();
      
      if (createError || !newBranch) throw new Error("Failed to create a default branch");
      return newBranch.id;
    }
    
    return data.id;
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

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          businessName={currentBusiness?.name || ''}
          userBusinesses={[]}
          onBusinessChange={() => {}}
        />
        
        <main className="flex-1 p-6 bg-muted/20">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Products</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="price">Selling Price</Label>
                        <Input 
                          id="price" 
                          type="number"
                          step="0.01" 
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cost_price">Cost Price</Label>
                        <Input 
                          id="cost_price" 
                          type="number"
                          step="0.01" 
                          value={formData.cost_price}
                          onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                          required
                        />
                      </div>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No products found. Create your first product by clicking "Add Product".
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.brand}</TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>${product.cost_price.toFixed(2)}</TableCell>
                        <TableCell>
                          {product.sold ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              Sold {product.sale_date && new Date(product.sale_date).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!product.sold && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleMarkAsSold(product)}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <ShoppingCart className="h-4 w-4 mr-1" />
                                  Mark as Sold
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
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
          )}
        </main>
      </div>
    </div>
  );
};

export default Products;
