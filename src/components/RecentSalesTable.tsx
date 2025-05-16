
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

interface RecentSalesTableProps {
  sales: Sale[];
}

const RecentSalesTable = ({ sales }: RecentSalesTableProps) => {
  // Calculate profit on each sale
  const calculateProfit = (sale: Sale) => {
    if (!sale.product) return 0;
    const costPrice = sale.product.cost_price * sale.quantity;
    return sale.total - costPrice;
  };

  return (
    <Card className="dashboard-card col-span-2">
      <CardHeader className="pb-2">
        <CardTitle>Recent Sales</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Profit/Loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                  No recent sales data available
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const profit = calculateProfit(sale);
                const isProfitable = profit >= 0;
                
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.product?.name || 'Unknown'}</TableCell>
                    <TableCell>{sale.branch?.name || 'Unknown'}</TableCell>
                    <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>${sale.total.toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(sale.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                      {isProfitable ? '+' : ''}{profit.toFixed(2)}
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
