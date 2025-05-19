
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

  return (
    <Card className="dashboard-card col-span-2">
      <CardHeader className="pb-2">
        <CardTitle>Recent Sales</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              {!isMobile && <TableHead>Branch</TableHead>}
              {!isMobile && <TableHead>Customer</TableHead>}
              <TableHead className="text-center">Qty</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Profit/Loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 4 : 6} className="text-center py-4 text-muted-foreground">
                  No recent sales data available
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const profit = calculateProfit(sale);
                const isProfitable = profit >= 0;
                
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {sale.product?.name || 'Unknown'}
                      {isMobile && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(sale.date).toLocaleDateString()} • {sale.branch?.name || 'Unknown'}
                        </div>
                      )}
                    </TableCell>
                    {!isMobile && <TableCell>{sale.branch?.name || 'Unknown'}</TableCell>}
                    {!isMobile && <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>}
                    <TableCell className="text-center">{sale.quantity}</TableCell>
                    <TableCell>{formatCurrency(sale.total)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={isProfitable ? "profit" : "loss"}>
                        {isProfitable ? '+' : ''}{formatCurrency(profit)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RecentSalesTable;
