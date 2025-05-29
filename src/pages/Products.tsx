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
import { Plus, Pencil, Trash2, ShoppingCart, MoreVertical } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Product } from '@/types';
import { MobileSaleDialog } from '@/components/MobileSaleDialog';
import { DesktopSaleDialog } from '@/components/DesktopSaleDialog';

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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProductWithQuantity extends Product {
  quantity: number;
  available_quantity?: number;
}


const Products = () => {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [products, setProducts] = useState<ProductWithQuantity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

      const productsWithQuantity = (data || []).map(product => ({
        ...product,
        quantity: product.quantity || 0,
        available_quantity: product.available_quantity || 0,
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
    if (!currentBusiness || isSubmitting) return;
    setIsSubmitting(true);
  
    if (!formData.name || !formData.brand) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Product name and brand are required.",
      });
      setIsSubmitting(false);
      return;
    }
  
    const price = parseFloat(formData.price);
    const costPrice = parseFloat(formData.cost_price);
    const quantity = parseInt(formData.quantity);
  
    if (isNaN(price) || isNaN(costPrice) || isNaN(quantity) || price <= 0 || costPrice <= 0 || quantity < 0) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Price and cost must be positive numbers, and quantity cannot be negative.",
      });
      setIsSubmitting(false);
      return;
    }
  
    const existingProduct = isEditing ? products.find(p => p.id === formData.id) : null;
    if (isEditing && !existingProduct) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product not found for editing.",
      });
      setIsSubmitting(false);
      return;
    }
  
    const productData = {
      name: formData.name,
      brand: formData.brand,
      price,
      cost_price: costPrice,
      quantity,
      business_id: currentBusiness.id,
      available_quantity: isEditing
        ? Math.max(existingProduct?.available_quantity || 0, quantity)
        : quantity,
      sold: false,
    };
  
    const previousProducts = products;
    if (isEditing) {
      setProducts(products.map(p => (p.id === formData.id ? { ...p, ...productData } : p)));
    } else {
      setProducts([...products, { ...productData, id: 'temp-' + Date.now() }]);
    }
  
    try {
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
  
      if (error) {
        const errorMessage =
          error.code === '23505'
            ? 'A product with this name already exists.'
            : error.message || 'An error occurred while saving the product.';
        toast({
          variant: "destructive",
          title: "Failed to save product",
          description: errorMessage,
        });
        setProducts(previousProducts);
        throw error;
      }
  
      toast({
        title: isEditing ? "Product updated" : "Product added",
        description: isEditing
          ? "Product has been successfully updated."
          : "New product has been successfully added.",
      });
  
      resetForm();
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      setProducts(previousProducts);
      toast({
        variant: "destructive",
        title: "Failed to save product",
        description: error.message || "An error occurred while saving the product.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  
   const formatter = new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return 'UGX 0';
    return formatter.format(amount);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader
          businessName={currentBusiness?.name || ''}
          userBusinesses={[]}
          onBusinessChange={() => {}}
        />

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sticky top-0 z-10 bg-gray-50 py-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Products</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 shadow-md"
                  aria-label="Add new product"
                >
                  <Plus className="mr-2 h-5 w-5" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-lg">
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
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="text-base"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        required
                        className="text-base"
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
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          className="text-base"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cost_price">Cost Price (UGX)</Label>
                        <Input
                          id="cost_price"
                          type="number"
                          step="100"
                          value={formData.cost_price}
                          onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                          required
                          className="text-base"
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
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        required
                        className="text-base"
                      />

                    </div>
                  </div>
                  <DialogFooter>
                  <Button
  type="submit"
  disabled={isSubmitting}
  className="bg-blue-600 hover:bg-blue-700 rounded-full"
>
  {isSubmitting ? (
    <span className="flex items-center">
      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      Saving...
    </span>
  ) : isEditing ? 'Update Product' : 'Add Product'}
</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
              <span className="text-gray-600">Loading products...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {isMobile ? (
                // Mobile Card Layout
                <div className="space-y-1.5">
                  {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                      <svg
                        className="h-12 w-12 text-gray-400 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h18M3 3v18M3 3l18 18"
                        />
                      </svg>
                      <p>No products found. Create your first product by clicking "Add Product".</p>
                    </div>
                  ) : (
                    products.map((product) => (
                      <div
                        key={product.id}
                        className={`p-3 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md ${
                          product.sold ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex justify-between items-center">
                            <h3 className="text-base font-semibold text-gray-900 truncate max-w-[60%]">
                              {product.name}
                            </h3>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-600"
                                  aria-label={`More actions for ${product.name}`}
                                >
                                  <MoreVertical className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!product.sold && product.available_quantity > 0 && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenSaleDialog(product)}
                                    className="text-green-600"
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-2" /> Sell
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleEditProduct(product)}
                                  className="text-blue-600"
                                >
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <div className="flex items-center text-red-600 cursor-pointer">
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                      </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete the product.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteProduct(product.id)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="truncate max-w-[30%]">{product.brand}</span>
                            <span>•</span>
                            <span>Qty: {product.available_quantity}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-base font-medium text-gray-900">
                              {formatCurrency(product.price)}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                product.sold
                                  ? 'bg-red-100 text-red-700 border-red-300'
                                  : product.quantity === 0
                                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                                  : 'bg-green-100 text-green-700 border-green-300'
                              }`}
                            >
                              {product.sold
                                ? 'Sold Out'
                                : product.quantity === 0
                                ? 'Out of Stock'
                                : `${product.quantity} in Stock`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Desktop Table Layout
                <div className="rounded-md border">
                  <ScrollArea className="w-full">
                    <div className="w-full overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8">
                                <div className="flex flex-col items-center">
                                  <svg
                                    className="h-12 w-12 text-gray-400 mb-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 3h18M3 3v18M3 3l18 18"
                                    />
                                  </svg>
                                  No products found. Create your first product by clicking "Add Product".
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            products.map((product) => (
                              <TableRow key={product.id} className={product.sold ? 'bg-muted/30' : ''}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>{product.brand}</TableCell>
                                <TableCell>{formatCurrency(product.price)}</TableCell>
                                <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                                <TableCell>{product.available_quantity}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      product.sold
                                        ? 'bg-red-50 text-red-600 border-red-200'
                                        : product.quantity === 0
                                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                                        : 'bg-green-50 text-green-600 border-green-200'
                                    }
                                  >
                                    {product.sold
                                      ? 'Sold Out'
                                      : product.quantity === 0
                                      ? 'Out of Stock'
                                      : `${product.quantity} in Stock`}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    {!product.sold && product.available_quantity > 0 && (
                                      <Button
                                        variant="outline"
                                        size="default"
                                        onClick={() => handleOpenSaleDialog(product)}
                                        className="text-green-600 border-green-600 hover:bg-green-50"
                                      >
                                        <ShoppingCart className="h-4 w-4 mr-1" /> Sell
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditProduct(product)}
                                      aria-label={`Edit ${product.name}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-red-600 border-red-600 hover:bg-red-50"
                                          aria-label={`Delete ${product.name}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete your product.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteProduct(product.id)}
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
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