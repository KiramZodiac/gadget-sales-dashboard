
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
import { Sale } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';

interface RecentSalesTableProps {
  sales: Sale[];
  title: string;
  
}

const RecentSalesTable = ({ sales }: RecentSalesTableProps) => {
  const isMobile = useIsMobile();
  
  // Calculate profit on each sale
  const calculateProfit = (sale: Sale) => {
    if (!sale.product) return 0;
    const costPrice = sale.product.cost_price * sale.quantity;
    return sale.total - costPrice;
  };
  
  // Format currency in Ugandan shillings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Mobile card view of sales
  const MobileSaleCard = ({ sale }: { sale: Sale }) => {
    const profit = calculateProfit(sale);
    const isProfitable = profit >= 0;
    
    return (
      <div className="p-4 border rounded-lg mb-3">
        <div className="flex justify-between">
          <div className="font-medium">{sale.product?.name || 'Unknown'}</div>
          <Badge variant={isProfitable ? "profit" : "loss"}>
            {isProfitable ? '+' : ''}{formatCurrency(profit)}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(sale.date).toLocaleDateString()} • {sale.branch?.name || 'Unknown'}
        </div>
        <div className="flex justify-between items-center mt-2">
          <div>Qty: {sale.quantity}</div>
          <div className="font-medium">{formatCurrency(sale.total)}</div>
        </div>
        {sale.customer && (
          <div className="text-xs mt-1">Customer: {sale.customer.name}</div>
        )}
      </div>
    );
  };

  return (
    <Card className="dashboard-card col-span-2">
      <CardHeader className="pb-2">
        <CardTitle>Recent Sales</CardTitle>
      </CardHeader>
      <CardContent className={isMobile ? "p-4" : "p-0 overflow-x-auto"}>
        {sales.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No recent sales data available
          </div>
        ) : isMobile ? (
          <div className="space-y-2">
            {sales.map((sale) => (
              <MobileSaleCard key={sale.id} sale={sale} />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => {
                const profit = calculateProfit(sale);
                const isProfitable = profit >= 0;
                
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {sale.product?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{sale.branch?.name || 'Unknown'}</TableCell>
                    <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                    <TableCell className="text-center">{sale.quantity}</TableCell>
                    <TableCell>{formatCurrency(sale.total)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={isProfitable ? "profit" : "loss"}>
                        {isProfitable ? '+' : ''}{formatCurrency(profit)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentSalesTable;
