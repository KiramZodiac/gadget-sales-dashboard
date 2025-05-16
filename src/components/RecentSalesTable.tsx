
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
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No recent sales data available
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.product?.name || 'Unknown'}</TableCell>
                  <TableCell>{sale.branch?.name || 'Unknown'}</TableCell>
                  <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                  <TableCell>{sale.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${sale.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {new Date(sale.date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RecentSalesTable;
