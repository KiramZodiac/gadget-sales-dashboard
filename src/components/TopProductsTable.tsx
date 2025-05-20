
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopProduct } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopProductsTableProps {
  products: TopProduct[];
}

const TopProductsTable = ({ products }: TopProductsTableProps) => {
  const isMobile = useIsMobile();
  
  // Format currency in Ugandan shillings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Mobile card view for top products
  const ProductCard = ({ product }: { product: TopProduct }) => (
    <div className="p-4 border rounded-lg mb-3">
      <div className="font-medium">{product.name}</div>
      <div className="text-xs text-muted-foreground">{product.brand}</div>
      <div className="flex justify-between items-center mt-2">
        <div>Units sold: {product.totalSold}</div>
        <div className="font-medium">{formatCurrency(product.totalRevenue)}</div>
      </div>
    </div>
  );

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent className={isMobile ? "p-4" : "px-0 overflow-x-auto"}>
        {products.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No product sales data available
          </div>
        ) : isMobile ? (
          <div className="space-y-2">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.brand}</TableCell>
                  <TableCell className="text-right">{product.totalSold}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.totalRevenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TopProductsTable;
