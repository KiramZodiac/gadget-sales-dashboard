
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
import { cn } from '@/lib/utils';

interface TopProductsTableProps {
  products: TopProduct[];
}

const TopProductsTable = ({ products }: TopProductsTableProps) => {
  const isMobile = useIsMobile();
  
  // If there are no products with sales (totalSold > 0), don't render the card at all
  if (!products || products.length === 0 || !products.some(p => p.totalSold > 0)) {
    return null;
  }
  
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
    <div className="p-3 border rounded-lg mb-2">
      <div className="font-medium">{product.name}</div>
      <div className="text-xs text-muted-foreground">{product.brand}</div>
      <div className="flex justify-between items-center mt-1">
        <div className="text-xs">Units sold: {product.totalSold}</div>
        <div className="text-sm font-medium">{formatCurrency(product.totalRevenue)}</div>
      </div>
    </div>
  );

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-xl", isMobile && "text-lg")}>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent className={isMobile ? "p-3" : "px-0 overflow-x-auto"}>
        {isMobile ? (
          <div>
            {products
              .filter(product => product.totalSold > 0)
              .map((product) => (
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
              {products
                .filter(product => product.totalSold > 0)
                .map((product) => (
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
